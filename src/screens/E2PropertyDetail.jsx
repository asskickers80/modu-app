import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const NAVY_DARK = '#0f2d57'

// ── 매물 더미 데이터 ────────────────────────────────────────
const LISTINGS = {
  t1: {
    id: 't1',
    title: '홍대 고양이 카페',
    biz: '카페·디저트',
    emoji: '🐱',
    gradFrom: '#b8cce8', gradTo: '#8aacd8',
    addr: '서울 마포구 서교동 401-3',
    addrShort: '서울 마포구 홍대입구역 도보 5분',
    transferType: 'business',
    floor: 'B1', area: '33㎡ (약 10평)',
    deposit: 3000, monthly: 200, maintenance: 10,
    transferFee: 2500,
    monthlyRevenue: 1200,
    posLinked: true,
    openedYear: 2020,
    tags: ['영업중', '인스타 팔로워 2만'],
    aiDesc: {
      fact: '서울 마포구 서교동, 홍대입구역 3번 출구 도보 5분 거리에 위치한 카페·디저트 전문점입니다. 2020년 개업 이후 4년 운영 중이며, 인스타그램 팔로워 2만 명을 보유한 고양이 테마 카페입니다.',
      estimate: '홍대 상권은 20~30대 유동인구 밀도가 서울 내 상위 5% 수준입니다. 테마형 카페의 재방문율은 일반 카페 대비 평균 1.4배 높은 것으로 추정되며, 인근 유사 권리금 시세(2,000~3,000만원) 대비 SNS 자산을 포함한 적정 수준으로 판단됩니다.',
    },
    market: { traffic: '매우 높음', competitors: 8, customers: '20~30대, 여성 60%', station: '홍대입구역 도보 5분' },
    facilities: ['에스프레소 머신 (La Marzocco GB5)', '냉장쇼케이스 2대', '키오스크 1대', '고양이 테마 인테리어 일체', 'POS 단말기 (카카오페이 연동)'],
    sellerNote: '건강 사정으로 양도 결정했습니다. 단골 고객과 SNS 채널 함께 인수 가능합니다. 진지한 분께만 매출 세부 내역 추가 공개합니다.',
  },
  t2: {
    id: 't2',
    title: '방이동 분식집',
    biz: '분식·포장마차',
    emoji: '🍜',
    gradFrom: '#c8d8f8', gradTo: '#a4b8e8',
    addr: '서울 송파구 방이동 45-8',
    addrShort: '서울 송파구 방이동',
    transferType: 'floor',
    floor: '1층', area: '45㎡ (약 13평)',
    deposit: 2000, monthly: 150, maintenance: 12,
    transferFee: 1800,
    monthlyRevenue: null,
    posLinked: false,
    openedYear: 2018,
    tags: ['매출증빙 연동', '단골 확보'],
    aiDesc: {
      fact: '서울 송파구 방이동 주거 상권 내 위치한 분식 전문점입니다. 2018년 개업 이후 6년 운영. 인근 아파트 단지 주민 단골 비중이 높습니다.',
      estimate: '주거 상권 특성상 반경 500m 내 주민 재방문 매출 비중이 높을 것으로 추정됩니다. 단골 유지 시 매출 연속성이 양호할 가능성이 높습니다.',
    },
    market: { traffic: '보통', competitors: 3, customers: '인근 주민, 30~50대', station: '방이역 도보 10분' },
    facilities: ['업소용 냉장고 2대', '가스레인지 6구', '환풍기 일체', '테이블 6세트 (의자 포함)'],
    sellerNote: '이사 사정으로 양도합니다. 시설 상태 양호합니다.',
  },
  t3: {
    id: 't3',
    title: '강남 미용실',
    biz: '미용·뷰티',
    emoji: '✂️',
    gradFrom: '#c0d0ec', gradTo: '#9cb4dc',
    addr: '서울 강남구 역삼동 812-5',
    addrShort: '서울 강남구 역삼동',
    transferType: 'business',
    floor: '2층', area: '66㎡ (약 20평)',
    deposit: 5000, monthly: 280, maintenance: 20,
    transferFee: 3500,
    monthlyRevenue: 2200,
    posLinked: true,
    openedYear: 2019,
    tags: ['시설 최신', '단골 300+'],
    aiDesc: {
      fact: '서울 강남구 역삼동에 위치한 미용실로 2019년 개업 이후 5년 운영. 단골 고객 300명 이상 확보. 2022년 전면 리모델링으로 시설 최신 상태입니다.',
      estimate: '강남 역삼 상권은 직장인 밀집 지역으로 고단가 미용 서비스 수요가 안정적입니다. 단골 300명 보유 시 인수 후 초기 매출 유지 가능성이 높을 것으로 추정됩니다.',
    },
    market: { traffic: '높음', competitors: 12, customers: '직장인, 20~40대', station: '역삼역 도보 3분' },
    facilities: ['샴푸대 5대', '미용 의자 6대', '2022년 인테리어 일체', '에어컨 2대', 'POS 단말기'],
    sellerNote: '원장 건강 사유로 양도합니다. 직원 인수 가능하며 1개월 인수인계 지원해드립니다.',
  },
}

const DEFAULT_ID = 't1'

// ── 유틸 ──────────────────────────────────────────────────
const won = (n) => `${n.toLocaleString()}만원`

// ── 하단 DM 토스트 ─────────────────────────────────────────
function DmBottomSheet({ onClose, onGo }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]"
            style={{ backgroundColor: NAVY_BG }}>
            💬
          </div>
          <div>
            <p className="text-[16px] font-bold text-gray-900">DM으로 문의 시작</p>
            <p className="text-[12px] text-gray-400 mt-0.5">전화번호는 공개되지 않아요</p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: NAVY_BG }}>
          <p className="text-[13px] leading-relaxed" style={{ color: NAVY }}>
            문의는 <strong>앱 내 DM</strong>으로만 시작돼요. 번호는 양쪽이 합의해야만 공개됩니다.
            양도자도 여러 문의에 자유롭게 응대할 수 있어요.
          </p>
        </div>
        <button
          onClick={onGo}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5"
          style={{ backgroundColor: NAVY }}>
          💬 DM 대화 시작하기
        </button>
        <button onClick={onClose}
          className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">
          취소
        </button>
      </div>
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────
export default function E2PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const listing = LISTINGS[id] || LISTINGS[DEFAULT_ID]
  const [bookmarked, setBookmarked] = useState(false)
  const [showDm, setShowDm] = useState(false)
  const { toast, showToast } = useToast()

  const isBusinessTransfer = listing.transferType === 'business'

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">

      {/* ── 스크롤 영역 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

        {/* ① 히어로 이미지 */}
        <div className="relative h-[240px] flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${listing.gradFrom}, ${listing.gradTo})` }}>
          <span className="text-[72px]">{listing.emoji}</span>

          {/* 상단 버튼들 */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12">
            <button onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 14l-5-5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setBookmarked(b => !b)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
                <svg width="16" height="18" viewBox="0 0 16 18" fill={bookmarked ? 'white' : 'none'}>
                  <path d="M2 2h12v14l-6-4-6 4V2z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => showToast()}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <circle cx="3" cy="8.5" r="2" stroke="white" strokeWidth="1.5" />
                  <circle cx="14" cy="3" r="2" stroke="white" strokeWidth="1.5" />
                  <circle cx="14" cy="14" r="2" stroke="white" strokeWidth="1.5" />
                  <path d="M5 7.5l7-4M5 9.5l7 4" stroke="white" strokeWidth="1.4" />
                </svg>
              </button>
            </div>
          </div>

          {/* 양도방식 배지 */}
          <div className="absolute bottom-3 left-4">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white"
              style={{ backgroundColor: isBusinessTransfer ? NAVY : '#374151' }}>
              {isBusinessTransfer ? '영업양도' : '바닥권리'}
            </span>
          </div>

          {/* 사진 더미 안내 */}
          <div className="absolute bottom-3 right-4">
            <span className="text-[10px] text-white/60">사진 0장 · 더미</span>
          </div>
        </div>

        <div className="px-5 pt-5 pb-36">

          {/* ② 핵심 헤드라인 */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-lg text-[12px] font-bold text-white"
                style={{ backgroundColor: NAVY }}>
                {listing.biz}
              </span>
              {listing.tags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                  style={{ backgroundColor: NAVY_BG, color: NAVY }}>
                  {t}
                </span>
              ))}
            </div>
            <h1 className="text-[22px] font-bold text-gray-900 mb-1">{listing.title}</h1>
            <p className="text-[13px] text-gray-400">{listing.addrShort}</p>
            <div className="flex items-end gap-2 mt-3">
              <span className="text-[13px] text-gray-500">희망 권리금</span>
              <span className="text-[28px] font-black leading-none" style={{ color: NAVY }}>
                {won(listing.transferFee)}
              </span>
            </div>
          </div>

          {/* ③ 기본 팩트 그리드 */}
          <div className="rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-[12px] font-bold text-gray-400 mb-3">기본 팩트</p>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              {[
                { label: '양도방식', value: isBusinessTransfer ? '영업양도 (권리금형)' : '바닥권리 (자리형)' },
                { label: '층 / 면적', value: `${listing.floor} / ${listing.area}` },
                { label: '보증금', value: won(listing.deposit) },
                { label: '월세', value: won(listing.monthly) },
                { label: '관리비', value: won(listing.maintenance) },
                { label: '개업연도', value: `${listing.openedYear}년 (업력 ${new Date().getFullYear() - listing.openedYear}년)` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] text-gray-400">{label}</p>
                  <p className="text-[13px] font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* 양도방식 설명 */}
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-start gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0"
                style={{ backgroundColor: NAVY_BG, color: NAVY }}>ⓘ</span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {isBusinessTransfer
                  ? '영업양도: 매출·단골·브랜드까지 통째로 넘겨요. 매출 증빙을 요청할 수 있어요.'
                  : '바닥권리: 자리값과 시설 잔존가만 넘겨요. 영업 내용은 포함 안 돼요.'}
              </p>
            </div>
          </div>

          {/* ④ AI 생성 설명문 */}
          <div className="rounded-2xl border border-gray-100 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold text-white bg-gray-700">
                🤖 AI 생성
              </span>
              <span className="text-[11px] text-gray-400">사실 / 추정 구분 표시됨</span>
            </div>

            {/* 사실 영역 */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NAVY }} />
                <span className="text-[11px] font-bold" style={{ color: NAVY }}>사실 (확인된 정보)</span>
              </div>
              <p className="text-[13px] text-gray-700 leading-relaxed pl-3.5">
                {listing.aiDesc.fact}
              </p>
            </div>

            {/* 추정 영역 */}
            <div className="rounded-xl p-3" style={{ backgroundColor: '#fffbf0' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[11px] font-bold text-amber-600">추정 (참고용)</span>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                {listing.aiDesc.estimate}
              </p>
            </div>
          </div>

          {/* ⑤ 상권 분석 */}
          <div className="rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-[13px] font-bold text-gray-900 mb-3">📍 상권 분석</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '유동인구', value: listing.market.traffic },
                { label: '주요 고객층', value: listing.market.customers },
                { label: '반경 500m 경쟁점', value: `${listing.market.competitors}개` },
                { label: '대중교통', value: listing.market.station },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3" style={{ backgroundColor: NAVY_BG }}>
                  <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                  <p className="text-[12px] font-bold" style={{ color: NAVY }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ⑥ 시설 정보 */}
          <div className="rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-[13px] font-bold text-gray-900 mb-3">🔧 시설 정보</p>
            <div className="flex flex-col gap-2">
              {listing.facilities.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: NAVY }} />
                  <p className="text-[13px] text-gray-700">{f}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ⑦ 매출 정보 (영업양도만) */}
          {isBusinessTransfer && listing.monthlyRevenue && (
            <div className="rounded-2xl border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[13px] font-bold text-gray-900">💰 매출 정보</p>
                {listing.posLinked && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                    POS 연동 확인
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-[13px] text-gray-500">월 평균 매출</span>
                <span className="text-[24px] font-black leading-none text-gray-900">
                  {won(listing.monthlyRevenue)}
                </span>
              </div>
              {/* 더미 막대 그래프 */}
              <div className="flex items-end gap-1.5 h-16 mb-2">
                {[85, 92, 78, 95, 100, 88, 96, 91, 87, 94, 98, 100].map((v, i) => (
                  <div key={i} className="flex-1 rounded-t-sm"
                    style={{ height: `${v}%`, backgroundColor: i === 11 ? NAVY : NAVY_BG }} />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 text-center">최근 12개월 매출 추이 (더미)</p>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-[11px] text-gray-400">
                  ⓘ DM 문의 후 진지한 양수자에게만 세부 내역을 공개합니다.
                </p>
              </div>
            </div>
          )}

          {/* ⑧ 양도자 한마디 */}
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: NAVY_BG }}>
            <p className="text-[12px] font-bold mb-2" style={{ color: NAVY }}>양도자 메모</p>
            <p className="text-[13px] text-gray-700 leading-relaxed">{listing.sellerNote}</p>
          </div>

          {/* 주의 문구 */}
          <p className="text-[11px] text-gray-300 text-center leading-relaxed">
            이 페이지의 정보는 양도자가 직접 입력했습니다.<br />
            모두는 거래 당사자가 아니며, 계약 전 반드시 직접 확인하세요.
          </p>

        </div>
      </main>

      {/* ── 하단 고정 DM 바 ── */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="4" width="10" height="7" rx="1.5" stroke="#9ca3af" strokeWidth="1.3" />
            <path d="M5 4V3a2 2 0 014 0v1" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <p className="text-[12px] text-gray-400">
            전화번호는 공개되지 않아요 — 양쪽 합의 후에만 교환됩니다
          </p>
        </div>
        <button
          onClick={() => setShowDm(true)}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ backgroundColor: NAVY }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H6l-3 2V5a1 1 0 011-1z"
              stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          DM으로 문의하기
        </button>
      </div>

      {showDm && (
        <DmBottomSheet
          onClose={() => setShowDm(false)}
          onGo={() => navigate('/d4/chat/new')}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
