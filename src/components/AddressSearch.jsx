import { useRef, useEffect } from 'react'

const DAUM_SCRIPT = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

function loadDaumScript() {
  return new Promise((resolve, reject) => {
    if (window.daum?.Postcode) { resolve(); return }
    const existing = document.querySelector(`script[src="${DAUM_SCRIPT}"]`)
    if (existing) {
      const wait = setInterval(() => {
        if (window.daum?.Postcode) { clearInterval(wait); resolve() }
      }, 100)
      return
    }
    const s = document.createElement('script')
    s.src = DAUM_SCRIPT
    s.onload = resolve
    s.onerror = () => reject(new Error('주소 검색 서비스 로드 실패'))
    document.head.appendChild(s)
  })
}

/**
 * AddressSearchModal
 * 앱 내 바텀시트로 Daum Postcode를 임베드합니다 (팝업 방식 대신).
 *
 * 사용법:
 *   const [open, setOpen] = useState(false)
 *   <button onClick={() => setOpen(true)}>주소 검색</button>
 *   {open && (
 *     <AddressSearchModal
 *       onSelect={({ address, roadAddress, jibunAddress, zonecode }) => {
 *         update({ address })
 *         setOpen(false)
 *       }}
 *       onClose={() => setOpen(false)}
 *     />
 *   )}
 */
export function AddressSearchModal({ onSelect, onClose }) {
  const containerRef = useRef(null)

  useEffect(() => {
    loadDaumScript()
      .then(() => {
        if (!containerRef.current) return
        new window.daum.Postcode({
          oncomplete: (data) => {
            onSelect({
              address: data.roadAddress || data.jibunAddress,
              roadAddress: data.roadAddress,
              jibunAddress: data.jibunAddress,
              zonecode: data.zonecode,
              buildingName: data.buildingName ?? '',
            })
            onClose()
          },
          width: '100%',
          height: '100%',
        }).embed(containerRef.current, { autoClose: false })
      })
      .catch((e) => {
        console.error('[AddressSearch]', e.message)
        alert('주소 검색 서비스를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.')
        onClose()
      })
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '390px',
          height: '85vh',
          backgroundColor: '#fff',
          borderRadius: '20px 20px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>주소 검색</span>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: 'none', background: '#f3f4f6', cursor: 'pointer',
              fontSize: '20px', color: '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
        </div>

        {/* Daum Postcode 임베드 영역 */}
        <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />
      </div>
    </div>
  )
}
