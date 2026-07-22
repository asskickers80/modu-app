// 홈 진행 가이드 단계 정의 — 양도인(seller)·임대인(landlord) 공유.
// 모두 실동작(DB) 기준 판정 — 관찰 불가한 단계는 만들지 않는다(장식 금지).

export function inquiryDateLabel(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return `${d.getMonth() + 1}월 ${d.getDate()}일 첫 문의 도착`
}

/** 양도인(seller) 진행 가이드 — A7SellerDashboard에서 이관(복제 금지). */
export function buildGuideSteps(listing, signals = {}) {
  const {
    inboundCount = 0, ownerReplied = false,
    firstThreadId = null, firstInquiryAt = null, unansweredCount = 0,
  } = signals
  const registered = !!listing && listing.status !== 'example'
  // 사진 정책: 내부 3장 필수 — 분리 컬럼 기준, 옛 매물(분리 전)은 합본 폴백
  const interiorPhotoCount = registered ? ((listing.interior_image_urls ?? listing.image_urls)?.length ?? 0) : 0
  const draftReviewed = registered && Object.keys(listing.review_choices ?? {}).length > 0
  const isPublic = registered && ['published', 'negotiating'].includes(listing.status)

  const detail = registered ? `/e2/${listing.id}` : null
  const steps = [
    { id: 'register', step: '매물 등록', done: registered,
      target: registered ? detail : '/e1/1', cta: '탭하여 등록 →' },
    { id: 'photos', step: '내부 사진 3장 올리기', done: registered && interiorPhotoCount >= 3,
      target: registered ? `/e1/3?edit=${listing.id}` : null, cta: '탭하여 추가 →' },
    { id: 'draft', step: '소개글 다듬기', done: draftReviewed,
      target: registered ? `/e1/2?edit=${listing.id}` : null, cta: '탭하여 확인 →' },
    { id: 'publish', step: '매물 공개하기', done: isPublic,
      target: detail, cta: '탭하여 공개 →' },
    { id: 'inquiry', step: '문의받기', done: inboundCount > 0, waiting: true,
      subtext: inboundCount > 0 ? inquiryDateLabel(firstInquiryAt) : '문의가 오면 모두가 바로 알려드려요',
      target: firstThreadId ? `/d4/chat/${firstThreadId}` : '/d4/inbox' },
    { id: 'negotiate', step: '협의시작', done: ownerReplied, cta: '탭하여 답장 →',
      subtext: (!ownerReplied && unansweredCount > 0) ? `답장을 기다리는 문의 ${unansweredCount}건` : null,
      target: '/d4/inbox' },
  ]
  const next = steps.find(s => !s.done)
  if (next) next.current = true
  return steps
}

/**
 * 임대인(landlord) 진행 가이드 — 실동작 기준 5단계.
 * 축(대표 확정): 등록 → 공개 → 문의받기 → 협의시작.
 * ※ '사진'은 임대인 저장 경로(E1p landlordPayload)가 image_urls를 빈 배열로 저장해
 *    영원히 미완료가 되는 장식 단계가 되므로 제외(관찰 불가 단계 금지 원칙).
 *    대신 관찰 가능한 '소개글 다듬기'(review_choices)를 넣는다. 사진 영속화 도입 시 재검토.
 * ※ 매각(sale) 병행 매물도 문의·협의는 동일(매수 문의) — deal_type 무관 단일 축.
 */
export function buildLandlordGuideSteps(listing, signals = {}) {
  const {
    inboundCount = 0, ownerReplied = false,
    firstThreadId = null, firstInquiryAt = null, unansweredCount = 0,
  } = signals
  const registered = !!listing && listing.status !== 'example'
  const draftReviewed = registered && Object.keys(listing.review_choices ?? {}).length > 0
  const isPublic = registered && ['published', 'negotiating'].includes(listing.status)
  // 임대인은 E1p 수정 진입(?edit=) 로딩 경로가 아직 없어, 완료 단계는 상세(E2L)로 보낸다(안전한 딥링크).
  const detail = registered ? `/e2l/${listing.id}` : null
  const inbox = '/d4/landlord/inbox'
  const steps = [
    { id: 'register', step: '상가 등록', done: registered,
      target: registered ? detail : '/e1p/1', cta: '탭하여 등록 →' },
    { id: 'draft', step: '소개글 다듬기', done: draftReviewed,
      target: detail, cta: '탭하여 확인 →' },
    { id: 'publish', step: '상가 공개하기', done: isPublic,
      target: detail, cta: '탭하여 공개 →' },
    { id: 'inquiry', step: '문의받기', done: inboundCount > 0, waiting: true,
      subtext: inboundCount > 0 ? inquiryDateLabel(firstInquiryAt) : '문의가 오면 모두가 바로 알려드려요',
      target: firstThreadId ? `/d4/chat/${firstThreadId}` : inbox },
    { id: 'negotiate', step: '협의시작', done: ownerReplied, cta: '탭하여 답장 →',
      subtext: (!ownerReplied && unansweredCount > 0) ? `답장을 기다리는 문의 ${unansweredCount}건` : null,
      target: inbox },
  ]
  const next = steps.find(s => !s.done)
  if (next) next.current = true
  return steps
}
