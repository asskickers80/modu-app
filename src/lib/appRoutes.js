/**
 * App.jsx에 실존하는 라우트 경로 목록.
 *
 * 용도: "라우트가 생기면 자동 노출" 판정 (더보기 시트의 D4 딥링크·미구현 화면 항목 등).
 * App.jsx에 라우트를 추가/삭제할 때 이 목록도 함께 갱신한다.
 * 목록 누락의 실패 방향은 "항목이 계속 숨겨짐"이라 앱이 깨지지 않는다 (안전한 방향).
 */
export const ROUTE_PATHS = [
  '/', '/a2',
  '/a3/seller', '/a3/landlord', '/a3/startup', '/a3/operating', '/a3/business',
  '/a4',
  '/auth/callback', '/auth/kakao-callback', '/auth/naver-callback', '/auth/reset-password',
  '/a7/seller', '/a7/landlord', '/a7/startup', '/a7/operating', '/a7/browsing', '/a7/business',
  '/e2/:id', '/e2l/:id',
  '/e1/1', '/e1/2', '/e1/3', '/e1/4',
  '/e1p/1', '/e1p/2', '/e1p/3', '/e1p/4', '/e1p/5',
  '/e1b/1', '/e1b/2', '/e1b/3', '/e1b/4', '/e1b/5',
  '/d4/inbox', '/d4/chat/:threadId',
  '/d4/landlord/inbox', '/d4/startup/inbox', '/d4/operating/inbox',
  '/d4/business/inbox', '/d4/business/chat/:threadId',
  '/explore', '/community', '/community/post/:postId',
  '/my', '/my/proposal-settings', '/my/:section',
  '/business/performance', '/business/push', '/operating/sales-input',
  '/auth-gate',
  '/dev', '/dev/review-log', '/dev/brand',
]

/** 경로(쿼리 무시)가 실존 라우트와 매칭되는지 — :param 세그먼트는 무엇이든 허용 */
export function hasRoute(path) {
  const clean = String(path).split('?')[0]
  return ROUTE_PATHS.some(p => {
    if (!p.includes(':')) return p === clean
    const pattern = p.split('/')
    const target = clean.split('/')
    return pattern.length === target.length
      && pattern.every((seg, i) => seg.startsWith(':') || seg === target[i])
  })
}
