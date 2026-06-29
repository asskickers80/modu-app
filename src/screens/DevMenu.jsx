import { useNavigate } from 'react-router-dom'

const GROUPS = [
  {
    label: '🔗 양도자 전체 흐름 (처음부터 끝까지)',
    color: '#0f2d57',
    bg: '#e8eef8',
    flow: true,
    items: [
      { name: '① A7  양도자 대시보드 (홈)', path: '/a7/seller', dot: '#1a4d8f' },
      { name: '② E1  매물 등록 1단계 (기본 팩트)', path: '/e1/1', dot: '#1a4d8f' },
      { name: '③ E2  매물 상세 — 양수자 뷰 미리보기', path: '/e2/t1', dot: '#1a4d8f' },
      { name: '④ D4  메시지함 (문의 목록)', path: '/d4/inbox', dot: '#1a4d8f' },
      { name: '⑤ D4  1:1 대화창 → 연락처 교환', path: '/d4/chat/th1', dot: '#16a34a' },
    ],
  },
  {
    label: 'A 시리즈 · 첫 진입 흐름',
    color: '#374151',
    bg: '#f9fafb',
    items: [
      { name: 'A1  스플래시', path: '/' },
      { name: 'A2  카테고리 선택', path: '/a2' },
      { name: 'A3  양도자 질문', path: '/a3/seller' },
      { name: 'A3  임대인 질문', path: '/a3/landlord' },
      { name: 'A3  창업준비 질문', path: '/a3/startup' },
      { name: 'A3  운영중 질문', path: '/a3/operating' },
      { name: 'A3  기업회원 질문', path: '/a3/business' },
      { name: 'A4  가입 방식', path: '/a4' },
    ],
  },
  {
    label: 'A7 · 첫 화면 (대시보드)',
    color: '#111827',
    bg: '#f9fafb',
    items: [
      { name: '양도자 대시보드', path: '/a7/seller', dot: '#1a4d8f' },
      { name: '임대인 대시보드', path: '/a7/landlord', dot: '#1e6b6b' },
      { name: '창업준비 추천피드', path: '/a7/startup', dot: '#2b8ac9' },
      { name: '운영중 대시보드', path: '/a7/operating', dot: '#2d7a4f' },
      { name: '기업회원 영업상황판', path: '/a7/business', dot: '#7d4ba3' },
      { name: '그냥구경 카드피드', path: '/a7/browsing', dot: '#8a8a8e' },
    ],
  },
  {
    label: 'E1 · 양도자 매물 등록 (5단계)',
    color: '#1a4d8f',
    bg: '#eef2fb',
    items: [
      { name: '1단계  기본 팩트 입력', path: '/e1/1' },
      { name: '2단계  AI 초안 생성', path: '/e1/2' },
      { name: '3단계  검수·수정', path: '/e1/3' },
      { name: '4단계  사진·증빙', path: '/e1/4' },
      { name: '5단계  완성도·공개', path: '/e1/5' },
    ],
  },
  {
    label: "E1' · 임대인 상가 등록 (5단계)",
    color: '#1e6b6b',
    bg: '#eef6f6',
    items: [
      { name: '1단계  기본 팩트', path: '/e1p/1' },
      { name: '2단계  AI 초안', path: '/e1p/2' },
      { name: '3단계  검수·수정', path: '/e1p/3' },
      { name: '4단계  사진·도면', path: '/e1p/4' },
      { name: '5단계  완성도·공개', path: '/e1p/5' },
    ],
  },
  {
    label: "E1'' · 기업회원 노출페이지 (5단계)",
    color: '#7d4ba3',
    bg: '#f5eefb',
    items: [
      { name: '1단계  한 줄 정체성', path: '/e1b/1' },
      { name: '2단계  이럴 때 부릅니다', path: '/e1b/2' },
      { name: '3단계  무엇을 해결합니다', path: '/e1b/3' },
      { name: '4단계  믿을 근거', path: '/e1b/4' },
      { name: '5단계  견적·문의 설정', path: '/e1b/5' },
    ],
  },
  {
    label: 'E2 · 매물 상세 (양수자 뷰)',
    color: '#92400e',
    bg: '#fffbeb',
    items: [
      { name: '홍대 고양이 카페 (영업양도)', path: '/e2/t1' },
      { name: '방이동 분식집 (바닥권리)', path: '/e2/t2' },
      { name: '강남 미용실 (영업양도)', path: '/e2/t3' },
    ],
  },
  {
    label: 'B1 · 마이 페이지',
    color: '#374151',
    bg: '#f9fafb',
    items: [
      { name: '마이 페이지', path: '/my', dot: '#1a4d8f' },
      { name: '마이 > 멤버십·구독', path: '/my/membership' },
      { name: '마이 > 결제 수단', path: '/my/payment-method' },
      { name: '마이 > FAQ', path: '/my/faq' },
      { name: '마이 > 실험실', path: '/my/lab' },
    ],
  },
  {
    label: 'B2 · 탐색 · 커뮤니티',
    color: '#374151',
    bg: '#f9fafb',
    items: [
      { name: '탐색 (매물 목록)', path: '/explore', dot: '#1a4d8f' },
      { name: '커뮤니티 (오픈채팅)', path: '/community', dot: '#1a4d8f' },
      { name: '커뮤니티 채팅방 — 홍대 양도자 모임', path: '/community/room/1' },
      { name: '커뮤니티 채팅방 — AI 정보방', path: '/community/room/2' },
      { name: '커뮤니티 채팅방 — 권리금 협상 Q&A', path: '/community/room/3' },
    ],
  },
  {
    label: 'B3 · 양도자 부가 화면',
    color: '#1a4d8f',
    bg: '#eef2fb',
    items: [
      { name: '시장 동향', path: '/seller/market' },
      { name: '업체 목록', path: '/seller/companies' },
      { name: '업체 상세 — 빠른인테리어', path: '/seller/company/biz1' },
      { name: '아티클 목록', path: '/seller/articles' },
      { name: '아티클 — 권리금 협상', path: '/seller/article/art1' },
    ],
  },
  {
    label: 'E2L · 상가 상세 (임차 희망자 뷰)',
    color: '#1e6b6b',
    bg: '#eef6f6',
    items: [
      { name: '서교동 코너 상가', path: '/e2l/v1' },
      { name: '연남동 단독상가', path: '/e2l/v2' },
      { name: '분당 정자동 상가', path: '/e2l/v3' },
    ],
  },
  {
    label: 'D4 임대인 · 메시지',
    color: '#1e6b6b',
    bg: '#eef6f6',
    items: [
      { name: '임대인 메시지함', path: '/d4/landlord/inbox' },
      { name: '임차 문의 — 예비창업자 김*', path: '/d4/landlord/chat/lth1' },
      { name: '임차 문의 — 이*님', path: '/d4/landlord/chat/lth2' },
    ],
  },
  {
    label: 'D4 기업회원 · 문의함',
    color: '#7d4ba3',
    bg: '#f5eefb',
    items: [
      { name: '기업 문의함', path: '/d4/business/inbox' },
      { name: '대화 — 마포 국밥집', path: '/d4/business/chat/bth1' },
      { name: '대화 — AI 매칭 수요', path: '/d4/business/chat/bth3' },
    ],
  },
  {
    label: '기업회원 · 성과 분석 + Push 영업',
    color: '#5c3380',
    bg: '#f5eefb',
    items: [
      { name: '노출 성과 상세', path: '/business/performance' },
      { name: 'Push 영업하기 (이중 게이트)', path: '/business/push' },
    ],
  },
  {
    label: '[F] 인증 게이트',
    color: '#374151',
    bg: '#f9fafb',
    items: [
      { name: '인증 게이트 — 연락처 교환', path: '/auth-gate?trigger=contact_exchange&return=/a7/seller' },
      { name: '인증 게이트 — 매물 등록', path: '/auth-gate?trigger=listing_register&return=/e1/1' },
      { name: '인증 게이트 — 기업회원 인증', path: '/auth-gate?trigger=business_verify&return=/a7/business' },
    ],
  },
  {
    label: 'D4 운영중 · 업체 문의',
    color: '#2d7a4f',
    bg: '#edf7f1',
    items: [
      { name: '운영중 메시지함', path: '/d4/operating/inbox' },
      { name: '대화 — 모두세무사무소', path: '/d4/operating/chat/oth1' },
      { name: '대화 — 서교동 인테리어', path: '/d4/operating/chat/oth2' },
      { name: '매출 입력 (E5 매출연동)', path: '/operating/sales-input' },
    ],
  },
  {
    label: 'D4 창업준비 · 내 문의',
    color: '#2b8ac9',
    bg: '#eef6fd',
    items: [
      { name: '내 문의함', path: '/d4/startup/inbox' },
      { name: '대화 — 서교동 코너 상가 임대인', path: '/d4/startup/chat/sth1' },
      { name: '대화 — 홍대 고양이 카페 양도자', path: '/d4/startup/chat/sth2' },
    ],
  },
  {
    label: 'D4 · 메시지 (양도자 시점)',
    color: '#1a4d8f',
    bg: '#eef2fb',
    items: [
      { name: '메시지함 (문의 목록)', path: '/d4/inbox' },
      { name: '1:1 대화창 — 예비창업자 김*', path: '/d4/chat/th1' },
      { name: '1:1 대화창 — 이*님', path: '/d4/chat/th2' },
      { name: '1:1 대화창 — 방이동 박*님', path: '/d4/chat/th4' },
      { name: '1:1 대화창 — 새 문의 (E2 진입)', path: '/d4/chat/new' },
    ],
  },
]

export default function DevMenu() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#0f172a' }}>

      {/* 헤더 */}
      <div className="px-5 pt-12 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
          style={{ backgroundColor: '#1e293b' }}>
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[11px] font-bold text-amber-400 tracking-wide">DEV ONLY</span>
        </div>
        <h1 className="text-[22px] font-black text-white mb-1">화면 바로가기</h1>
        <p className="text-[13px] text-slate-400">
          개발·테스트용 메뉴예요. 원하는 화면으로 바로 이동하세요.
        </p>
      </div>

      {/* 그룹 목록 */}
      <div className="px-4 flex flex-col gap-4">
        {GROUPS.map(group => (
          <div key={group.label} className="rounded-2xl overflow-hidden">

            {/* 그룹 헤더 */}
            <div className="px-4 py-2.5"
              style={{ backgroundColor: group.color }}>
              <p className="text-[12px] font-bold text-white">{group.label}</p>
            </div>

            {/* 항목들 */}
            <div className="flex flex-col divide-y" style={{ backgroundColor: group.bg, divideColor: '#e5e7eb' }}>
              {group.items.map((item, idx) => (
                <div key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-all"
                    style={{ backgroundColor: group.bg }}>
                    {item.dot && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.dot }} />
                    )}
                    <span className="flex-1 text-[14px] font-medium text-gray-800">{item.name}</span>
                    <span className="text-[11px] font-mono text-gray-400">{item.path}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M4 7h6M7 4l3 3-3 3" stroke="#9ca3af" strokeWidth="1.4"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {/* 흐름 연결 화살표 */}
                  {group.flow && idx < group.items.length - 1 && (
                    <div className="flex items-center justify-center py-1"
                      style={{ backgroundColor: group.bg }}>
                      <span className="text-[11px] font-bold" style={{ color: '#1a4d8f' }}>↓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

      {/* 하단 안내 */}
      <p className="text-center text-[11px] text-slate-600 mt-8 px-5">
        이 페이지는 /dev 주소로만 접근 가능해요.<br />
        실제 앱 흐름에는 노출되지 않아요.
      </p>

    </div>
  )
}
