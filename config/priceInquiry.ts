/**
 * '모두에 시세 물어보기' 단일 소스 (ORDER 2026-09-11 파트 C). 값은 대표 확인 없이 바꾸지 않는다.
 * 사용자 화면의 입구는 항상 하나("모두에 시세 물어보기"). 모두 명의로 특정 점포의 권리금·거래 조건을 회신하는 문안은 없다.
 */
export const PRICE_INQUIRY = {
  modu_direct_enabled: false, // PLACEHOLDER — 중개·컨설팅 법인 설립 후 대표 확정 (대표만 켠다)
  modu_vendor_id: null as string | null, // 법인이 기업회원으로 들어올 때의 listings.id — 다른 업체와 같은 규칙, 우선 발송 없음(§1-1)
  label_template: ['vendor_only', 'vendor_and_modu'] as const,
  max_cards: 3,          // 사용자에게 보여주는 응답 카드 최대 (지시문 E의 5보다 작게) // PLACEHOLDER — 대표 확정 전
  dedupe_days: 30,       // 같은 사용자·같은 점포·같은 요청 칩 30일 1회
  feedback_after_days: 7,
  expire_days: 7,
}

export const PRICE_INQUIRY_COPY = {
  button: '모두에 시세 물어보기',
  title: '모두에 시세 물어보기',
  label: {
    vendor_only: '답변은 모두에 입점한 부동산·상담 업체가 해요 · 연락처는 업체가 답한 뒤 대화를 열 때만 전달돼요',
    vendor_and_modu: '답변은 모두와 입점 업체가 해요 · 연락처는 답한 뒤 대화를 열 때만 전달돼요',
  },
  send: '물어보기',
  dedupe: '이미 물어보는 중이에요 · 답이 오면 알려드릴게요',
  pending: '아직 근처 입점 업체가 없어요 · 생기면 알려드릴게요',
  expired: '답이 없었어요 · 다시 물어볼 수 있어요',
  laterRegister: '나중에 등록하기',
  ownerLink: '임대료·매매 시세 물어보기',
  responseCard: '{vendor}이 답했어요 · 평균 답장 {hours}시간 · 입점 {months}개월',
  openDm: '대화 열기', decline: '괜찮아요', more: '더 보기',
  feedbackAsk: '답변이 도움이 됐나요?',
  vendorReplyDefault: '{vendor}입니다. {dong} {industry} {areaBand} 점포 시세, 자료를 보고 답드릴게요.',
  vendorStats: '시세 문의 답변 {n}건 · 대화로 이어진 {k}건',
}

export const REQUEST_CHIPS = [
  { key: 'transfer_fee', label: '권리금 시세' },
  { key: 'rent_sale', label: '임대료·매매 시세' },
  { key: 'timing', label: '지금 내놓을지 판단' },
  { key: 'cases', label: '비슷한 점포 거래 사례' },
]
export const TIMING_CHIPS = [
  { key: 'this_month', label: '이번 달 안에' },
  { key: 'in_3m', label: '3개월 안에' },
  { key: 'browsing', label: '아직 알아보는 중' },
]
export const FEEDBACK_CHIPS = [
  { key: 'helped', label: '도움이 됐어요' },
  { key: 'not_yet', label: '아직 진행 중' },
  { key: 'no_contact', label: '연락이 없었어요' },
]
/** 첨부 구간 — 면적 10㎡ 단위, 월세 50만 단위 (금액·이름·연락처·정확한 주소는 첨부 항목에 없다) */
export const AREA_BAND_STEP = 10
export const RENT_BAND_STEP = 50
