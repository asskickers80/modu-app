/**
 * useDaumPostcode — Daum 우편번호 서비스 훅
 * API 키 없음, 무료. E1/E1p/E1b 어디서나 재사용.
 *
 * 사용법:
 *   const openAddr = useDaumPostcode((result) => {
 *     console.log(result.address)      // 도로명 주소 (선택 시 메인)
 *     console.log(result.jibunAddress) // 지번 주소
 *     console.log(result.zonecode)     // 우편번호
 *   })
 *   <button onClick={openAddr}>주소 검색</button>
 */

const DAUM_SCRIPT = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

function loadDaumScript() {
  return new Promise((resolve, reject) => {
    if (window.daum?.Postcode) { resolve(); return }
    if (document.querySelector(`script[src="${DAUM_SCRIPT}"]`)) {
      // 이미 로딩 중 — 완료 대기
      const wait = setInterval(() => {
        if (window.daum?.Postcode) { clearInterval(wait); resolve() }
      }, 100)
      return
    }
    const script = document.createElement('script')
    script.src = DAUM_SCRIPT
    script.onload = resolve
    script.onerror = () => reject(new Error('Daum Postcode 스크립트 로드 실패'))
    document.head.appendChild(script)
  })
}

export function useDaumPostcode(onSelect) {
  const open = async () => {
    try {
      await loadDaumScript()
      new window.daum.Postcode({
        oncomplete: (data) => {
          onSelect({
            address: data.roadAddress || data.jibunAddress,
            roadAddress: data.roadAddress,
            jibunAddress: data.jibunAddress,
            zonecode: data.zonecode,
            buildingName: data.buildingName ?? '',
          })
        },
        theme: {
          bgColor: '#ffffff',
          searchBgColor: '#f9fafb',
          contentBgColor: '#ffffff',
          pageBgColor: '#f9fafb',
          textColor: '#111827',
          queryTextColor: '#111827',
          postcodeTextColor: '#1a4d8f',
          emphTextColor: '#1a4d8f',
          outlineColor: '#e5e7eb',
        },
      }).open()
    } catch (e) {
      console.error('[AddressSearch]', e.message)
      alert('주소 검색 서비스를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.')
    }
  }
  return open
}
