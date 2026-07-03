import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import ModuMark from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'
import { getProfile } from '../lib/userProfile'
import { generateBusinessCoaching, generateBusinessPerformanceInsight } from '../lib/gemini'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DARK = '#5c3478'
const PURPLE_DEEP = '#2d1a4a'

// ── 아이콘 ─────────────────────────────────────────────────
function HomeIcon({ active }) {
  const c = active ? PURPLE : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={active ? PURPLE_BG : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? PURPLE : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? PURPLE : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
function MessageIcon({ active }) {
  const c = active ? PURPLE : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? PURPLE : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" />
      <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const NAV_TABS = [
  { id: 'home', label: '홈', Icon: HomeIcon },
  { id: 'explore', label: '탐색', Icon: ExploreIcon },
  { id: 'community', label: '커뮤니티', Icon: CommunityIcon },
  { id: 'message', label: '메시지', Icon: MessageIcon },
  { id: 'my', label: '마이', Icon: MyIcon },
]

function Card({ children, className = '', style = {} }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 p-4 ${className}`} style={style}>
      {children}
    </div>
  )
}

function SlotHeader({ num, title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white"
          style={{ backgroundColor: PURPLE }}>{num}</span>
        <p className="text-[14px] font-bold text-gray-900">{title}</p>
      </div>
      {action && (
        <button onClick={onAction} className="text-[12px] font-medium" style={{ color: PURPLE }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ── 슬롯 ① 오늘의 알림 ───────────────────────────────────

const BIZ_DEMANDS = {
  brokerage: {
    msgs: [
      { id: 'd1', name: '예비창업자 김*', time: '7분 전', preview: '홍대 인근 카페 점포 중개 의뢰드립니다.', hot: true },
      { id: 'd2', name: '이*님', time: '2시간 전', preview: '권리금 협상 컨설팅 가능한지요?', hot: false },
    ],
    ai: [
      { id: 'a1', region: '서울 마포구', context: '카페 창업 희망, 3천만원 이하 매물 중개 요청', fit: 94 },
      { id: 'a2', region: '경기 성남시', context: '음식점 양도 원하는 사장님, 컨설팅 요청', fit: 88 },
    ],
  },
  facility: {
    msgs: [
      { id: 'd1', name: '마포 국밥집', time: '7분 전', preview: '다음 달 리모델링 견적 부탁드려요...', hot: true },
      { id: 'd2', name: '강남 카페', time: '2시간 전', preview: '간판 교체 비용이 얼마나 될까요?', hot: false },
    ],
    ai: [
      { id: 'a1', region: '서울 강남구', context: '창업 준비 중, 50㎡ 이하 카페 인테리어 견적 필요', fit: 92 },
      { id: 'a2', region: '경기 성남시', context: '음식점 리뉴얼, 예산 800만원, 이번 달 착공 희망', fit: 87 },
    ],
  },
  tax: {
    msgs: [
      { id: 'd1', name: '서울 분식집', time: '10분 전', preview: '부가세 신고 도움받고 싶어요.', hot: true },
      { id: 'd2', name: '마포 카페', time: '3시간 전', preview: '직원 4명 인건비 처리 방법 문의요.', hot: false },
    ],
    ai: [
      { id: 'a1', region: '서울 강남구', context: '창업 3개월차, 세무 기장 서비스 필요', fit: 91 },
      { id: 'a2', region: '부산 해운대', context: '법인 전환 검토 중, 세무사 상담 요청', fit: 85 },
    ],
  },
  finance: {
    msgs: [
      { id: 'd1', name: '예비창업자 박*', time: '5분 전', preview: '창업 대출 한도가 얼마나 될까요?', hot: true },
      { id: 'd2', name: '운영 중 김*', time: '1시간 전', preview: '정책자금 신청 방법 알고 싶어요.', hot: false },
    ],
    ai: [
      { id: 'a1', region: '서울 은평구', context: '소상공인 창업 대출 1억원 이하 문의', fit: 90 },
      { id: 'a2', region: '경기 고양시', context: '운영 자금 보험 결합 상품 관심', fit: 83 },
    ],
  },
  franchise: {
    msgs: [
      { id: 'd1', name: '가맹 문의 이*', time: '15분 전', preview: '가맹 조건과 예상 수익 알고 싶어요.', hot: true },
      { id: 'd2', name: '예비 가맹 최*', time: '4시간 전', preview: '설명회 일정 확인하고 싶습니다.', hot: false },
    ],
    ai: [
      { id: 'a1', region: '서울 강동구', context: '프랜차이즈 창업 희망, 2억원 이하 투자 가능', fit: 93 },
      { id: 'a2', region: '인천 부평구', context: '식음료 가맹 탐색 중, 설명회 참여 의향 있음', fit: 86 },
    ],
  },
  service: {
    msgs: [
      { id: 'd1', name: '연남동 카페', time: '8분 전', preview: 'POS 교체 견적 받고 싶어요.', hot: true },
      { id: 'd2', name: '마포 분식집', time: '2시간 전', preview: '배달앱 연동 도움받을 수 있나요?', hot: false },
    ],
    ai: [
      { id: 'a1', region: '서울 마포구', context: '신규 오픈 예정, POS + 키오스크 패키지 문의', fit: 92 },
      { id: 'a2', region: '경기 수원시', context: '배달 플랫폼 입점 및 마케팅 대행 요청', fit: 84 },
    ],
  },
}

function Slot1Alerts({ navigate, bizType }) {
  const demands = BIZ_DEMANDS[bizType] ?? BIZ_DEMANDS.facility
  const [handled, setHandled] = useState({})
  return (
    <section className="mb-5">
      <SlotHeader num="①" title="오늘의 알림" action="전체보기 →" onAction={() => navigate('/d4/business/inbox')} />

      {/* 직접 문의 DM */}
      <p className="text-[11px] font-bold text-gray-400 mb-2">💬 직접 문의 (DM)</p>
      <div className="flex flex-col gap-2 mb-4">
        {demands.msgs.map(m => (
          <button key={m.id}
            onClick={() => navigate('/d4/business/inbox')}
            className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border text-left active:scale-[0.99] transition-all"
            style={{ borderColor: m.hot ? PURPLE + '40' : '#e5e7eb', backgroundColor: m.hot ? PURPLE_BG : '#ffffff' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: m.hot ? PURPLE : '#f3f4f6' }}>
              <span className="text-[16px]">{m.hot ? '🔥' : '💬'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-bold" style={{ color: m.hot ? PURPLE : '#111827' }}>{m.name}</p>
                {m.hot && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                    style={{ backgroundColor: PURPLE }}>뜨거운 리드</span>
                )}
                <span className="ml-auto text-[11px] text-gray-400 shrink-0">{m.time}</span>
              </div>
              <p className="text-[12px] text-gray-500 mt-0.5 truncate">{m.preview}</p>
            </div>
          </button>
        ))}
      </div>

      {/* AI 추천 수요 */}
      <p className="text-[11px] font-bold text-gray-400 mb-2">✨ AI 추천 수요</p>
      <div className="flex flex-col gap-2">
        {demands.ai.map(d => (
          <div key={d.id}
            className="px-4 py-3.5 rounded-2xl border border-gray-100 flex items-start gap-3"
            style={{ backgroundColor: handled[d.id] ? '#f0fdf4' : '#ffffff' }}>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: '#16a34a' }}>AI 매칭 {d.fit}%</span>
                <span className="text-[11px] text-gray-500">{d.region}</span>
              </div>
              <p className="text-[12px] text-gray-700 mt-1 leading-snug">{d.context}</p>
            </div>
            {handled[d.id] ? (
              <button onClick={() => navigate('/d4/business/inbox')}
                className="text-[11px] font-bold text-green-600 shrink-0">DM 개시됨 ✓ →</button>
            ) : (
              <button
                onClick={() => { setHandled(prev => ({ ...prev, [d.id]: true })); navigate('/d4/business/inbox') }}
                className="px-3 py-2 rounded-xl text-[12px] font-bold text-white shrink-0 active:scale-95"
                style={{ backgroundColor: PURPLE }}>
                가능해요
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── 슬롯 ② 내 노출 성과 ───────────────────────────────────

function ChangeBadge({ val, up }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: up ? '#dcfce7' : '#fee2e2', color: up ? '#16a34a' : '#dc2626' }}>
      {up ? '↑' : '↓'}{Math.abs(val)}%
    </span>
  )
}

function Slot2Performance({ bizTypeLabel, regionLabel, navigate }) {
  const stats = [
    { label: '본', val: 1240, pct: 18, up: true },
    { label: '검색', val: 347, pct: 5, up: true },
    { label: '문의', val: 12, pct: 3, up: false },
    { label: '전환', val: 4, pct: 33, up: true },
  ]
  return (
    <section className="mb-5">
      <SlotHeader num="②" title="내 노출 성과" action="상세 →" onAction={() => navigate('/business/performance')} />
      <div className="grid grid-cols-4 gap-2">
        {stats.map(s => (
          <Card key={s.label} className="!p-3 text-center">
            <p className="text-[10px] text-gray-400">{s.label}</p>
            <p className="text-[18px] font-black text-gray-900 mt-1">{s.val}</p>
            <div className="flex justify-center mt-1">
              <ChangeBadge val={s.pct} up={s.up} />
            </div>
          </Card>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-2 text-center">이번 주 · 전주 대비</p>
    </section>
  )
}

// ── 슬롯 ③ 놓친 수요 (FOMO 미끼) ─────────────────────────

const MISSED = [
  { region: '강남구', count: 3, biz: '인테리어 견적', when: '오늘' },
  { region: '마포구', count: 1, biz: '간판 교체', when: '어제' },
  { region: '성동구', count: 2, biz: '시공 문의', when: '이번 주' },
]

function Slot3Missed({ showToast }) {
  return (
    <section className="mb-5">
      <SlotHeader num="③" title="놓친 수요" />
      <div className="rounded-2xl overflow-hidden border border-gray-100">
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ backgroundColor: PURPLE_BG }}>
          <span className="text-[12px]">📦</span>
          <p className="text-[11px] font-bold flex-1" style={{ color: PURPLE }}>
            무료 공개 · 누가·연락처는 프리미엄만
          </p>
        </div>
        <div className="flex flex-col divide-y divide-gray-50">
          {MISSED.map((m, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: PURPLE_BG }}>
                <span className="text-[14px]">📍</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-gray-800">
                  {m.region}에서 {m.count}건
                </p>
                <p className="text-[11px] text-gray-400">{m.biz} · {m.when}</p>
              </div>
              <div className="text-[20px] text-gray-200">···</div>
            </div>
          ))}
        </div>
        <button onClick={() => showToast('프리미엄 준비 중이에요 🚧')}
          className="w-full py-3 text-[12px] font-bold border-t border-gray-50"
          style={{ backgroundColor: '#faf8ff', color: PURPLE }}>
          ✨ 프리미엄으로 먼저 받기
        </button>
      </div>
    </section>
  )
}

// ── 슬롯 ④ 내 노출 페이지 다듬기 ─────────────────────────

function Slot4Page({ navigate, showToast }) {
  const score = 62
  const blocks = [
    { label: '① 한 줄 정체성', done: true },
    { label: '② 이럴 때 부릅니다', done: false },
    { label: '③ 무엇을 해결합니다', done: true },
    { label: '④ 믿을 근거', done: false },
    { label: '⑤ 견적·문의', done: true },
  ]

  return (
    <section className="mb-5">
      <SlotHeader num="④" title="내 노출 페이지" action="수정하기" onAction={() => navigate('/e1b/1')} />
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-[56px] h-[56px] shrink-0">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#e5e7eb" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke={PURPLE} strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - score / 100)}`}
                strokeLinecap="round" transform="rotate(-90 28 28)" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[13px] font-black" style={{ color: PURPLE }}>{score}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-gray-800">페이지가 60% 완성됐어요</p>
            <p className="text-[12px] text-gray-400 mt-0.5">② 트리거와 ④ 근거를 채우면 매칭이 정확해져요</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {blocks.map(b => (
            <div key={b.label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: b.done ? PURPLE : '#e5e7eb' }}>
                {b.done ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                )}
              </div>
              <span className={`text-[12px] ${b.done ? 'text-gray-500' : 'font-semibold text-gray-800'}`}>
                {b.label}
              </span>
              {!b.done && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: PURPLE_BG, color: PURPLE }}>입력 필요</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => navigate('/e1b/1')}
            className="flex-1 py-3 rounded-xl text-[13px] font-bold text-white"
            style={{ backgroundColor: PURPLE }}>
            페이지 다듬기
          </button>
          <button onClick={() => showToast('노출 업그레이드 준비 중이에요 🚧')}
            className="flex-1 py-3 rounded-xl text-[13px] font-bold border-2"
            style={{ borderColor: PURPLE + '40', color: PURPLE }}>
            더 띄우기 ✨
          </button>
        </div>
      </Card>
    </section>
  )
}

// ── 슬롯 ⑤ 동종 비교 ────────────────────────────────────

function Slot5Compare({ bizTypeLabel, regionLabel, navigate }) {
  return (
    <section className="mb-5">
      <SlotHeader num="⑤" title="동종 비교" action="자세히 →" onAction={() => navigate('/business/competitor')} />
      <div className="grid grid-cols-2 gap-2.5">
        <Card>
          <p className="text-[11px] text-gray-400 mb-1">{bizTypeLabel} · {regionLabel}</p>
          <p className="text-[11px] font-bold text-gray-500">평균 전환율</p>
          <p className="text-[18px] font-black text-gray-900">3.2%</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#d97706' }}>내 전환율 1.1% (하위 35%)</p>
        </Card>
        <Card>
          <p className="text-[11px] text-gray-400 mb-1">이번 달 신규 문의</p>
          <p className="text-[11px] font-bold text-gray-500">업종 평균</p>
          <p className="text-[18px] font-black text-gray-900">18건</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#16a34a' }}>내 문의 12건 (평균 66%)</p>
        </Card>
      </div>
    </section>
  )
}

// ── 슬롯 ⑥ 구독·결제 ───────────────────────────────────

function Slot6Subscription({ navigate, showToast }) {
  return (
    <section className="mb-5">
      <SlotHeader num="⑥" title="구독·결제" action="관리 →" onAction={() => navigate('/my')} />
      <Card>
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
          <span className="text-[22px]">🟣</span>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-gray-900">무료 플랜</p>
            <p className="text-[11px] text-gray-400">12분류 표준 알림 · 표준 속도</p>
          </div>
          <button onClick={() => navigate('/my/membership')} className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
            style={{ backgroundColor: PURPLE }}>
            업그레이드
          </button>
        </div>
        <div className="space-y-2">
          {[
            { label: '인접 분류 알림 (프리미엄)', locked: true },
            { label: '먼저 받기 · 속도 우선', locked: true },
            { label: '놓친 수요 상세 열람', locked: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-[12px] text-gray-400">
              <span>🔒</span>{item.label}
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

// ── 슬롯 ⑦ 업계 동향 ───────────────────────────────────

const TRENDS = [
  { emoji: '📈', title: '2024 상반기 인테리어 시장 분석 리포트', tag: '데이터' },
  { emoji: '📰', title: '소상공인 창업 증가 → 인테리어 수요 12% ↑', tag: '뉴스' },
]

function Slot7Trends({ navigate }) {
  return (
    <section className="mb-5">
      <SlotHeader num="⑦" title="업계 동향" action="더보기 →" onAction={() => navigate('/business/trend')} />
      <div className="flex flex-col gap-2.5">
        {TRENDS.map(t => (
          <Card key={t.title} onClick={() => navigate('/business/trend')} className="flex items-start gap-3 cursor-pointer active:scale-[0.99] transition-all">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: PURPLE_BG }}>
              <span className="text-[18px]">{t.emoji}</span>
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1 inline-block"
                style={{ backgroundColor: PURPLE_BG, color: PURPLE }}>{t.tag}</span>
              <p className="text-[13px] font-semibold text-gray-800 leading-snug">{t.title}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── 슬롯 ⑧ 광고 팁 ─────────────────────────────────────

function Slot8Tips() {
  return (
    <section className="mb-2">
      <SlotHeader num="⑧" title="노출 팁" />
      <div className="flex flex-col gap-2">
        {[
          { emoji: '💡', tip: '② 트리거를 5개 채우면 추천 알림 정확도가 40% 올라요' },
          { emoji: '📸', tip: '포트폴리오 사진 3장 이상이면 전환율이 2.1배 증가해요' },
          { emoji: '⚡', tip: '응답 속도를 "즉시"로 설정하면 상위 노출 우선권을 받아요' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border border-gray-100 bg-white">
            <span className="text-[16px] shrink-0 mt-0.5">{item.emoji}</span>
            <p className="text-[12px] text-gray-600 leading-relaxed">{item.tip}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── 메인 ─────────────────────────────────────────────────

const BIZ_COACHING_CACHE_KEY = 'modu_business_coaching'
const BIZ_INSIGHT_CACHE_KEY = 'modu_business_insight'

export default function A7BusinessDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const { toast, showToast } = useToast()
  const profile = getProfile()
  const bizTypeLabel = profile.bizTypeLabel ?? '내 업체'
  const bizTypeEmoji = profile.bizTypeEmoji ?? '🏢'
  const regionLabel = profile.region ?? '지역 미설정'

  const [coaching, setCoaching] = useState(null)
  const [coachLoading, setCoachLoading] = useState(false)
  const [perfInsight, setPerfInsight] = useState(null)
  const [perfLoading, setPerfLoading] = useState(false)

  const fetchCoaching = useCallback(async (force = false) => {
    const today = new Date().toISOString().slice(0, 10)
    if (!force) {
      try {
        const cached = localStorage.getItem(BIZ_COACHING_CACHE_KEY)
        if (cached) {
          const { date, text } = JSON.parse(cached)
          if (date === today) { setCoaching(text); return }
        }
      } catch { /* ignore */ }
    }
    setCoachLoading(true)
    try {
      const text = await generateBusinessCoaching({
        bizName: bizTypeLabel, category: '시설·인테리어',
        exposureViews: 1240, exposureChange: 18, dmCount: 12, conversionRate: 1.1,
      })
      setCoaching(text)
      localStorage.setItem(BIZ_COACHING_CACHE_KEY, JSON.stringify({ date: today, text }))
    } catch { /* ignore */ } finally { setCoachLoading(false) }
  }, [bizTypeLabel])

  const fetchPerfInsight = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10)
    try {
      const cached = localStorage.getItem(BIZ_INSIGHT_CACHE_KEY)
      if (cached) {
        const { date, text } = JSON.parse(cached)
        if (date === today) { setPerfInsight(text); return }
      }
    } catch { /* ignore */ }
    setPerfLoading(true)
    try {
      const text = await generateBusinessPerformanceInsight({
        category: '시설·인테리어', views: 1240, viewsChange: 18, dmCount: 12, conversionRate: 1.1,
      })
      setPerfInsight(text)
      localStorage.setItem(BIZ_INSIGHT_CACHE_KEY, JSON.stringify({ date: today, text }))
    } catch { /* ignore */ } finally { setPerfLoading(false) }
  }, [])

  useEffect(() => {
    fetchCoaching()
    fetchPerfInsight()
  }, [fetchCoaching, fetchPerfInsight])

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#faf8ff' }}>

      {/* ── 헤더 (보라색 모드) ── */}
      <header className="shrink-0" style={{ backgroundColor: PURPLE_DEEP }}>
        <div className="flex items-center gap-2 px-5 pt-12 pb-3">
          <button onClick={() => setShowProfileSheet(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border border-white/20 active:opacity-80"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'white' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300" />
            기업회원
          </button>
          <span className="text-[11px] font-bold text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-900/40">
            🛡️ 검증됨
          </span>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-1.5">
              <ModuMark size={18} color="rgba(255,255,255,0.8)" highlight="none" />
              <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.8)' }}>모두</span>
            </div>
          </div>
          <button onClick={() => showToast('알림 준비 중이에요 🚧')} className="relative w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a5 5 0 015 5v2.5l1 1.5H2l1-1.5V7a5 5 0 015-5z"
                stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M6.5 13a1.5 1.5 0 003 0" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-400" />
          </button>
        </div>

        <div className="px-5 pb-4">
          <p className="text-[13px] text-purple-300 mb-0.5">영업 상황판</p>
          <p className="text-[20px] font-black text-white">{bizTypeEmoji} {bizTypeLabel}</p>
          <p className="text-[12px] text-purple-300 mt-0.5">{regionLabel} · {bizTypeLabel}</p>
        </div>

        {/* 오늘 요약 */}
        <div className="px-5 pb-3 grid grid-cols-3 gap-2">
          {[
            { label: '오늘 조회', val: 24 },
            { label: '신규 문의', val: 2 },
            { label: 'AI 추천', val: 2 },
          ].map(s => (
            <div key={s.label}
              className="rounded-xl py-2.5 text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-[18px] font-black text-white">{s.val}</p>
              <p className="text-[10px] text-purple-300">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Push 영업하기 버튼 */}
        <div className="px-5 pb-4">
          <button onClick={() => navigate('/business/push')}
            className="w-full py-3 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span>🚀</span> 능동 영업하기 (Push 발신)
          </button>
        </div>
      </header>

      {/* ── 스크롤 피드 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6">

          <div className="text-[11px] font-bold text-gray-300 mb-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>영업 상황판</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* AI 오늘의 한 마디 */}
          <div className="rounded-2xl px-4 py-3.5 mb-5"
            style={{ background: `linear-gradient(135deg, #7d4ba318 0%, #7d4ba308 100%)`, border: '1px solid #7d4ba325' }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black text-white"
                style={{ backgroundColor: PURPLE }}>
                AI
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-bold" style={{ color: PURPLE }}>오늘의 한 마디</p>
                  <button onClick={() => fetchCoaching(true)} className="text-[16px] text-gray-300 leading-none">↺</button>
                </div>
                {coachLoading ? (
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: PURPLE, animation: `bounce 0.9s ease-in-out ${i * 0.15}s infinite` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-gray-700 leading-snug">
                    {coaching ?? '노출 성과를 분석 중이에요...'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Slot1Alerts navigate={navigate} bizType={profile.bizType} />
          <Slot2Performance bizTypeLabel={bizTypeLabel} regionLabel={regionLabel} navigate={navigate} />

          {/* AI 노출 성과 해석 */}
          {(perfInsight || perfLoading) && (
            <div className="rounded-2xl px-4 py-3 mb-5 border border-gray-100"
              style={{ backgroundColor: PURPLE_BG }}>
              <div className="flex items-start gap-2.5">
                <span className="text-[14px] shrink-0 mt-0.5">🔍</span>
                <div className="flex-1">
                  <p className="text-[11px] font-bold mb-1" style={{ color: PURPLE }}>AI 성과 해석</p>
                  {perfLoading ? (
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: PURPLE, animation: `bounce 0.9s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-gray-700 leading-relaxed">{perfInsight}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Slot3Missed showToast={showToast} />
          <Slot4Page navigate={navigate} showToast={showToast} />

          <div className="text-[11px] font-bold text-gray-300 my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>AI 큐레이션</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <Slot5Compare bizTypeLabel={bizTypeLabel} regionLabel={regionLabel} navigate={navigate} />
          <Slot6Subscription navigate={navigate} showToast={showToast} />
          <Slot7Trends navigate={navigate} />
          <Slot8Tips />

        </div>
      </main>

      <Toast message={toast} />
      <ProfileSwitchSheet isOpen={showProfileSheet} onClose={() => setShowProfileSheet(false)} />
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
      {/* ── 하단 네비 ── */}
      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {NAV_TABS.map(tab => {
            const active = activeNav === tab.id
            return (
              <button key={tab.id}
                onClick={() => {
                  if (tab.id === 'message') { navigate('/d4/business/inbox'); return }
                  if (tab.id === 'explore') { navigate('/explore'); return }
                  if (tab.id === 'community') { navigate('/community'); return }
                  if (tab.id === 'my') { navigate('/my'); return }
                  setActiveNav(tab.id)
                }}
                className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
                <span className="relative">
                  <tab.Icon active={active} />
                  {tab.id === 'message' && <MessageTabDot />}
                </span>
                <span className="text-[10px] font-semibold"
                  style={{ color: active ? PURPLE : '#9ca3af' }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

    </div>
  )
}
