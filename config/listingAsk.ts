/**
 * '모두에 질문하기' 단일 소스 (ORDER 2026-09-13 파트 A2). 값·문안은 대표 확인 없이 바꾸지 않는다.
 * 목적은 답변이 아니라 분류다 — ① 우리 데이터로 답함 / ② 주인만 아는 것은 모두가 대신 물어봄 / ③ 시세·권리금은 '모두에 시세 물어보기'로.
 * 다섯 축 중 영업시간·배달비중·인건비는 우리 데이터에 없다. 그게 의도다 — 그 셋이 문의를 만드는 축이다.
 */
export const ASK = {
  EXAMPLES_MIN: 3,
  EXAMPLES_MAX: 4,
  MIN_DATA_EXAMPLES: 2,       // ① 최소 2개
  MIN_OWNER_EXAMPLES: 1,      // ② 최소 1개 (없으면 문의가 생기지 않는다)
  QUESTION_MAX: 200,
  DAILY_LIMIT_PER_LISTING: 10,// 사용자당·매물당 1일 (대표 확정 2026-09-13)
  FOLLOWUPS: 2,
  OWNER_EXPIRE_DAYS: 7,       // ② 질문 만료
  OWNER_REMIND_HOURS: 24,     // 만료 24시간 전 리마인드 1회
  RAW_KEEP_DAYS: 90,          // 원문 보관 (docs/principles/ASK_LOG.md)
}

export const AXIS = ['trade', 'area', 'hours', 'delivery', 'labor', 'facility', 'contract', 'price', 'other'] as const
export const AXIS_LABEL: Record<string, string> = {
  trade: '업종', area: '지역·상권', hours: '영업시간', delivery: '배달', labor: '인건비',
  facility: '집기·시설', contract: '계약', price: '시세', other: '기타',
}

export type AskTemplate = { key: string; axis: string; branch: 'data' | 'owner'; requires: string[]; text: string }

/** ① 데이터 답변 + ② 주인 확인 템플릿. requires 가 전부 충족될 때만 후보가 된다. */
export const TEMPLATES: AskTemplate[] = [
  // ① 업종
  { key: 'trade_nearby', axis: 'trade', branch: 'data', requires: ['sbiz_radius'], text: '이 근처에 {업종}이 몇 곳이나 있어요?' },
  { key: 'trade_mix', axis: 'trade', branch: 'data', requires: ['sbiz_mix'], text: '여기는 어떤 업종이 많아요?' },
  { key: 'trade_reason', axis: 'trade', branch: 'data', requires: ['transfer_reason'], text: '왜 내놓으시는 거예요?' },
  // ① 지역·상권
  { key: 'area_vacancy', axis: 'area', branch: 'data', requires: ['reb_vacancy'], text: '{구} 소규모 상가 공실률은 어때요?' },
  { key: 'area_rent', axis: 'area', branch: 'data', requires: ['reb_rent', 'area', 'monthly_rent'], text: '이 자리 임대료는 주변 평균이랑 비교하면 어때요?' },
  { key: 'area_station', axis: 'area', branch: 'data', requires: ['station_distance'], text: '{역}에서 걸어서 몇 분이에요?' },
  { key: 'area_road', axis: 'area', branch: 'data', requires: ['road_face'], text: '큰길에 붙어 있어요?' },
  { key: 'area_building_year', axis: 'area', branch: 'data', requires: ['building_year'], text: '건물은 몇 년 됐어요?' },
  { key: 'area_floor_area', axis: 'area', branch: 'data', requires: ['floor', 'area'], text: '몇 층이고 전용면적은 얼마예요?' },
  { key: 'area_listed_days', axis: 'area', branch: 'data', requires: ['created_at'], text: '올라온 지 얼마나 됐어요?' },
  // ② 영업시간
  { key: 'hours_open', axis: 'hours', branch: 'owner', requires: [], text: '몇 시부터 몇 시까지 하세요?' },
  { key: 'hours_off', axis: 'hours', branch: 'owner', requires: [], text: '쉬는 날은 언제예요?' },
  { key: 'hours_peak', axis: 'hours', branch: 'owner', requires: [], text: '손님이 몰리는 시간대는 언제예요?' },
  // ② 배달비중
  { key: 'delivery_share', axis: 'delivery', branch: 'owner', requires: [], text: '홀이랑 배달 비중이 어떻게 돼요?' },
  { key: 'delivery_apps', axis: 'delivery', branch: 'owner', requires: [], text: '배달앱은 어디 쓰세요?' },
  { key: 'delivery_without', axis: 'delivery', branch: 'owner', requires: [], text: '배달 없이도 돌아가는 자리예요?' },
  // ② 인건비
  { key: 'labor_count', axis: 'labor', branch: 'owner', requires: [], text: '직원은 몇 명이에요?' },
  { key: 'labor_cost', axis: 'labor', branch: 'owner', requires: [], text: '인건비는 한 달에 얼마나 들어요?' },
  { key: 'labor_solo', axis: 'labor', branch: 'owner', requires: [], text: '혼자서도 운영되나요?' },
  // 축 무관 — 등록 필드에 값이 있으면 data 로 자동 승격(rules.promote)
  { key: 'facility_included', axis: 'facility', branch: 'owner', requires: [], text: '집기·시설은 그대로 넘기시는 거예요?' },
  { key: 'contract_remaining', axis: 'contract', branch: 'owner', requires: [], text: '계약 기간은 얼마나 남았어요?' },
]

/** 해당 축이 이미 등록되어 있으면 그 축 ② 템플릿은 후보에서 뺀다(이미 답이 있는 걸 묻게 하지 않는다) */
export const AXIS_LISTING_FIELDS: Record<string, string[]> = {
  hours: ['open_hours', 'business_hours'],
  delivery: ['delivery_share', 'delivery_apps'],
  labor: ['staff_count', 'labor_cost'],
  facility: ['facilities', 'remaining_facilities'],
  contract: ['remaining_term', 'available_from'],
}

/** ③ 으로 넘길 질문 — 판정어. 답하지 않고 '모두에 시세 물어보기'로 보낸다 */
// 아래 두 목록은 화면 문안이 아니라 걸러내기 위한 판정어다
export const PRICE_ROUTE_WORDS = ['시세', '권리금', '적정', '적당한 가격', '비싼', '비싸', '싼', '깎', '네고', '팔릴', '팔 수 있', '얼마 받', '얼마에', '값이', '가격이 맞'] // lint-copy-allow (판정어 목록)

/** ①(데이터) 판정 키워드 → 화이트리스트 필드 */
export const DATA_KEYWORDS: Record<string, string[]> = {
  sbiz_radius: ['몇 곳', '경쟁', '근처에', '주변에 같은', '얼마나 있'],
  sbiz_mix: ['어떤 업종', '업종 구성', '무슨 가게'],
  reb_vacancy: ['공실', '빈 상가', '빈 점포'],
  reb_rent: ['임대료', '주변 평균', '월세 평균'],
  station_distance: ['역에서', '역까지', '도보', '걸어서', '몇 분'],
  road_face: ['큰길', '대로', '도로', '코너', '모퉁이'],
  building_year: ['건물', '준공', '몇 년', '연식', '오래'],
  floor: ['몇 층', '층수', '층이'],
  area: ['면적', '평', '전용'],
  created_at: ['올라온 지', '등록한 지', '언제 올라'],
  transfer_reason: ['왜 내놓', '이유', '왜 파'],
}

/** 축 분류(로그·②카드 표시용) */
export const AXIS_KEYWORDS: Record<string, string[]> = {
  hours: ['몇 시', '영업시간', '쉬는 날', '휴무', '오픈', '마감', '시간대'],
  delivery: ['배달', '홀', '포장', '배민', '쿠팡이츠', '요기요'],
  labor: ['직원', '알바', '인건비', '혼자', '사람 쓰'],
  facility: ['집기', '시설', '설비', '기계', '인테리어', '에어컨'],
  contract: ['계약', '만기', '재계약', '임대차', '기간'],
  trade: ['업종', '메뉴', '손님', '단골', '매출 구성'],
  area: ['상권', '유동', '주차', '역', '동네'],
  price: PRICE_ROUTE_WORDS,
}

export const ASK_COPY = {
  sectionTitle: '모두에 질문하기',
  sectionNotice: '모두가 가진 공개 정보로 답해요 · 점포 주인에게 묻는 건 [문의하기]예요',
  placeholderFallback: '궁금한 것을 물어보세요',
  ownerLine: '이건 점포 주인만 알아요 · 모두가 대신 물어봐 드릴게요',
  ownerButton: '물어봐 주세요',
  ownerSent: '모두가 주인에게 물어볼게요 · 답이 오면 알려드릴게요',
  priceLine: '가격은 모두에 시세 물어보기로 이어드릴게요',
  quota: '오늘은 이 매물에 질문을 다 쓰셨어요 · 내일 다시 물어보실 수 있어요',
  followupTitle: '이어서 물어볼 만한 것',
  // ② 파이프라인 (파트 C4) — 고정 문안. 성사 약속·품질 평가 표현 금지(C4-a)
  ownerCardTitle: '모두에게 질문이 들어왔어요',
  ownerBasisViews: '이 매물을 {n}번 봤어요',
  ownerBasisAnswered: '모두가 먼저 답한 질문 {k}개({axes})',
  ownerBasisTail: '이건 주인만 아는 내용이라 여쭤봐요',
  ownerReplyButton: '답하기',
  ownerAfterReply: '문의자에게 이렇게 전달하고, 실제 문의로 이어지도록 안내할게요',
  ownerRelayed: '문의자에게 전달했어요',
  ownerOpened: '문의자가 대화를 열었어요 · 이제 직접 이야기하실 수 있어요',
  ownerNotOpened: '아직 대화로 이어지지 않았어요',
  ownerRemind: '아직 답하지 않은 질문이 있어요',
  inboxLabel: '모두가 걸러낸 문의',
  relayTitle: '물어본 것에 주인이 답했어요',
  relaySource: '점포 주인이 보낸 답이에요',
  relayOpen: '대화 열기',
  relaySave: '찜해두기',
  relayExpired: '주인이 답하지 않아 질문이 닫혔어요 · 문의하기로 직접 물어보실 수 있어요',
}

/** 응답에 섞이면 그 문장만 폐기 (A5) */
export const ASK_FORBIDDEN = /권리금|시세|적정|비싸|싸다|매출(?!액 없음)|상권이|전망|잘 될|유망|추천|예상|추정|\bAI\b/ // lint-copy-allow (판정어 목록)
