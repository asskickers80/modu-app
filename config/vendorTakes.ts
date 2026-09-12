/**
 * 기업회원 '함께 일한 사장님 한마디' 단일 소스 (ORDER 2026-09-12 파트 C). PLACEHOLDER 값은 대표 확인 없이 바꾸지 않는다.
 * 초대 링크·업체 승인제. 매물·양도인·소유주에는 붙이지 않는다(대표 결정 2026-09-12). 무료·유료 입점 공통 MAX_APPROVED — plan_tier 로 바꾸는 코드 금지(§1-3).
 */
export const TAKES = {
  INVITE_HOURS: 72,           // PLACEHOLDER — 대표 확정 전
  MAX_RESPONSES: 5,           // PLACEHOLDER — 대표 확정 전
  MAX_APPROVED: 3,            // 무료·유료 공통
  MAX_PENDING: 20,
  VOICE_SEC: 30,
  BODY_MAX: 150,
  NAME_MAX: 20,
  require_login_for_take: false, // PLACEHOLDER — 대표 확인 대기 (true 면 링크 페이지가 앱 로그인으로 리다이렉트)
}
export const TAKE_CHIPS = ['중개', '인테리어', '세무', '간판', '시설', '기타']
export const TAKES_COPY = {
  sectionTitle: '함께 일한 사장님 한마디',
  sectionFoot: '업체가 초대한 분들이 남긴 말이에요 · 업체가 골라서 올려요',
  inviteButton: '한마디 부탁하기',
  inviteNotice: '함께 일한 사장님께 보내 주세요 · {hours}시간 동안 {max}분까지 답할 수 있어요',
  linkTitle: '이 업체와 함께 일하셨나요? 한마디 남겨 주세요',
  done: '업체가 확인한 뒤에 프로필에 올라가요',
  closed: '이 초대는 마감됐어요',
  expired: '이 초대는 기간이 지났어요',
  full: '답할 수 있는 인원이 다 찼어요',
  approveMax: '한마디는 {n}개까지 올릴 수 있어요',
}
