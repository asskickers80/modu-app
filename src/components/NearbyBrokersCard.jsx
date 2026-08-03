import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchExternalBrokersForBases, fetchPartnerBrokers, composeBrokerSlots, distanceKm } from '../lib/nearbyBrokers'

/**
 * 내 주변 부동산 — 양도인·임대인 홈 공용 (ORDER-nearby-brokers-v1, 복제 금지).
 * 기업회원 유료 노출의 원형: 입점사 상단 우선, 외부(네이버 지역 검색)는 임시 채움.
 * - 등록 동선을 가로막지 않는 곁 정보 — 권유 문구 금지.
 * - 외부는 "여기 있다"까지만: 상호·동·거리, 탭=네이버 지도 외부 링크, [참고 정보] 라벨.
 * - 입점은 뱃지·사진·홍보 문구(입점사 작성)·태그, 탭=앱 내 상세(/e2b/:id — 기업회원 축에서 라우트 예정).
 * - 기준 위치 없음(상가 0 + A3 지역 없음) 또는 외부 키 미도착이고 입점도 0곳이면 카드 자체 미렌더.
 * - 복수 매물이 여러 지역이면 지역별 검색을 라운드로빈으로 섞어 각 지역 최소 1곳 반영 (대표 지시).
 */
export default function NearbyBrokersCard({ bases, accent = '#1a4d8f' }) {
  const navigate = useNavigate()
  const [slots, setSlots] = useState(null)
  const basesKey = JSON.stringify((bases ?? []).map(b => b?.address ?? null)) // 인라인 배열 참조 안정화

  useEffect(() => {
    let alive = true
    if (!(bases ?? []).some(b => b?.address)) { setSlots(null); return } // 가짜 지역 금지
    Promise.all([fetchPartnerBrokers(), fetchExternalBrokersForBases(bases)])
      .then(([partners, externals]) => {
        if (!alive) return
        const s = composeBrokerSlots(partners, externals ?? [])
        setSlots(s.length > 0 ? s : null)
      })
      .catch(() => { if (alive) setSlots(null) })
    return () => { alive = false }
  }, [basesKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!slots) return null

  const hasExternal = slots.some(s => s.type === 'external')
  return (
    <section className="mb-4" data-testid="nearby-brokers">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <p className="text-t13 font-bold text-gray-700">🏠 내 주변 부동산</p>
        {hasExternal && (
          <span className="text-t10 text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">참고 정보</span>
        )}
      </div>
      <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50 bg-white">
        {slots.map((s, i) => s.type === 'partner' ? (
          /* 모두 입점 — 표현·유입·연결은 입점사의 것 */
          <button key={s.id ?? i}
            data-testid="broker-partner"
            onClick={() => navigate(`/e2b/${s.id}`)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-70">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gray-50">
              {s.photo && <img src={s.photo} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-t14 font-bold text-gray-900 truncate">{s.name}</p>
                <span className="text-t9 font-bold px-1.5 py-0.5 rounded-full shrink-0 text-white" style={{ backgroundColor: accent }}>모두 입점</span>
              </div>
              {s.tagline && <p className="text-t12 text-gray-500 mt-0.5 truncate">{s.tagline}</p>}
              {s.tags.length > 0 && (
                <p className="text-t10 mt-0.5 truncate" style={{ color: accent }}>{s.tags.map(t => `#${t}`).join(' ')}</p>
              )}
            </div>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <path d="M6 3l6 6-6 6" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          /* 외부 참고 — 상호·동·거리까지만. 표현 요소 없음, 탭은 네이버 지도로 나간다 */
          <button key={`ext-${i}`}
            data-testid="broker-external"
            onClick={() => window.open(`https://map.naver.com/p/search/${encodeURIComponent(s.name)}`, '_blank', 'noopener')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-70">
            <div className="flex-1 min-w-0">
              <p className="text-t14 font-medium text-gray-800 truncate">{s.name}</p>
              <p className="text-t12 text-gray-400 mt-0.5">
                {s.dong}
                {(() => { const d = distanceKm(s.baseCoords, s); return d != null ? ` · ${d}km` : '' })()}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
              <path d="M5.5 2.5h6v6M11.5 2.5L6 8M4 3H2.5v8.5H11V10" stroke="#c4c4c6" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        ))}
      </div>
    </section>
  )
}
