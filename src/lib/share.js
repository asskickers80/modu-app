import { PUBLIC_ORIGIN } from './appOrigin'

/**
 * 실제 공유 — OS 공유 시트(navigator.share) 우선, 미지원 브라우저는 링크 복사 폴백.
 * '링크 복사' 별도 항목은 없다: OS 공유 시트 안의 '복사'가 그 역할을 대신한다.
 * 반환: 'shared'(공유 시트 완료) | 'aborted'(사용자 취소) | 'copied'(클립보드 폴백) | 'failed'
 */
export async function shareLink({ title, text, path }) {
  const url = path?.startsWith('http') ? path : `${PUBLIC_ORIGIN}${path ?? ''}`
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'aborted'
      // NotAllowedError 등 — 클립보드 폴백으로 진행
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
