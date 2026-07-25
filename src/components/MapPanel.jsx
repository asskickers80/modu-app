import { useEffect, useRef, useState } from 'react'

// Web Dynamic Map 클라이언트 ID (공개 키). 없으면 지도 미로드 → 정직 폴백.
const NCP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID ?? null

let scriptPromise = null
function loadNaverMaps() {
  if (typeof window === 'undefined' || !NCP_CLIENT_ID) return Promise.reject(new Error('no-key'))
  if (window.naver?.maps?.Panorama) return Promise.resolve(window.naver)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    // panorama 서브모듈 = 거리뷰. 지도 진입 시 함께 로드되나 파노라마 객체는 탭 시 생성(쿼터 절약)
    // ncpKeyId = 신규 VPC 콘솔 Maps 앱 규격 (구 ncpClientId는 legacy AI·NAVER API용)
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NCP_CLIENT_ID}&submodules=panorama`
    s.async = true
    s.onload = () => window.naver?.maps ? resolve(window.naver) : reject(new Error('load-fail'))
    s.onerror = () => reject(new Error('load-fail'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

/**
 * 지도 + 거리뷰 패널 — 축 무관 공용(props: 좌표·공개여부만). E2L·(향후)E2 재사용.
 * 폴백 우선: 키/좌표 없거나 로드 실패·거리뷰 미커버 시 빈 회색 박스 대신 정직한 안내.
 */
export default function MapPanel({ lat, lng, address, show = true }) {
  const [tab, setTab] = useState('map') // 'map' | 'road'
  const [status, setStatus] = useState('loading') // loading | ready | nokey | error
  const [roadState, setRoadState] = useState('idle') // idle | ready | none
  const mapRef = useRef(null)
  const panoRef = useRef(null)
  const mapObj = useRef(null)
  const panoObj = useRef(null)

  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)

  useEffect(() => {
    if (!show || !hasCoords) return
    let cancelled = false
    loadNaverMaps()
      .then(naver => {
        if (cancelled || !mapRef.current) return
        mapObj.current = new naver.maps.Map(mapRef.current, {
          center: new naver.maps.LatLng(lat, lng), zoom: 17,
        })
        new naver.maps.Marker({ position: new naver.maps.LatLng(lat, lng), map: mapObj.current })
        setStatus('ready')
      })
      .catch(e => { if (!cancelled) setStatus(e.message === 'no-key' ? 'nokey' : 'error') })
    return () => { cancelled = true }
  }, [show, hasCoords, lat, lng])

  // 거리뷰 탭 진입 시에만 파노라마 생성 (쿼터 절약). 미커버면 정직 안내.
  useEffect(() => {
    if (tab !== 'road' || status !== 'ready' || panoObj.current || !panoRef.current) return
    const naver = window.naver
    try {
      panoObj.current = new naver.maps.Panorama(panoRef.current, {
        position: new naver.maps.LatLng(lat, lng), pov: { pan: 0, tilt: 0, fov: 100 },
      })
      naver.maps.Event.addListener(panoObj.current, 'pano_status', (s) => {
        setRoadState(s === 'OK' ? 'ready' : 'none')
      })
      // 일부 버전은 status 이벤트 대신 즉시 표시 — 폴백 타이머로 none 판정 보류
      setRoadState('ready')
    } catch {
      setRoadState('none')
    }
  }, [tab, status, lat, lng])

  if (!show) return null

  // 폴백들 — 빈 회색 박스 금지, 항상 이유 있는 안내
  const Fallback = ({ text }) => (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-8 text-center">
      <span className="text-[22px]">🗺️</span>
      <p className="text-[13px] text-gray-400 mt-2">{text}</p>
      {address && <p className="text-[12px] text-gray-300 mt-1">{address}</p>}
    </div>
  )

  if (!hasCoords) return <Fallback text="위치 좌표를 준비 중이에요" />
  if (status === 'nokey') return <Fallback text="지도를 준비 중이에요" />
  if (status === 'error') return <Fallback text="지도를 불러오지 못했어요" />

  return (
    <div data-testid="map-panel">
      <div className="flex gap-1.5 mb-2">
        {[{ id: 'map', label: '지도' }, { id: 'road', label: '거리뷰' }].map(t => (
          <button key={t.id} data-testid={`map-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
            style={tab === t.id
              ? { backgroundColor: '#1e6b6b', color: '#fff' }
              : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative rounded-2xl overflow-hidden border border-gray-100" style={{ height: 220 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', display: tab === 'map' ? 'block' : 'none' }} />
        <div style={{ width: '100%', height: '100%', display: tab === 'road' ? 'block' : 'none' }}>
          <div ref={panoRef} style={{ width: '100%', height: '100%' }} />
          {tab === 'road' && roadState === 'none' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 px-4 text-center" data-testid="road-none">
              <span className="text-[22px]">🚶</span>
              <p className="text-[13px] text-gray-400 mt-2">이 위치는 거리뷰가 제공되지 않아요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
