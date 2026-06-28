import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'
const GREEN_LIGHT = '#d1ead9'

// ── 아이콘 ─────────────────────────────────────────────────

function HomeIcon({ active }) {
  const c = active ? GREEN : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={active ? GREEN_BG : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? GREEN : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? GREEN : '#9ca3af'
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
  const c = active ? GREEN : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? GREEN : '#9ca3af'
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

// ── 변화량 뱃지 ────────────────────────────────────────────

function ChangeBadge({ pct, up }) {
  const color = up ? '#16a34a' : '#dc2626'
  const bg = up ? '#dcfce7' : '#fee2e2'
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color }}>
      {up ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  )
}

// ── 섹션 헤더 ─────────────────────────────────────────────

function SlotHeader({ num, title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white"
          style={{ backgroundColor: GREEN }}>
          {num}
        </span>
        <p className="text-[14px] font-bold text-gray-900">{title}</p>
      </div>
      {action && (
        <button onClick={onAction} className="text-[12px] font-medium" style={{ color: GREEN }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ── 공통 카드 래퍼 ─────────────────────────────────────────

function Card({ children, className = '', style = {} }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 p-4 ${className}`} style={style}>
      {children}
    </div>
  )
}

// ── 슬롯 ① 오늘 매출 ──────────────────────────────────────

function Slot1Sales() {
  const today = 324000
  const yesterday = 288000
  const pct = Math.round((today - yesterday) / yesterday * 100)
  const monthTotal = 6280000
  const monthAvg = 5900000

  return (
    <section className="mb-5">
      <Card style={{ background: `linear-gradient(135deg, ${GREEN}10 0%, ${GREEN}05 100%)`, borderColor: GREEN + '20' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-semibold text-gray-400 mb-1">오늘 매출</p>
            <p className="text-[30px] font-black text-gray-900 leading-none">
              {today.toLocaleString()}<span className="text-[16px] font-bold ml-1">원</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <ChangeBadge pct={pct} up={pct >= 0} />
              <span className="text-[11px] text-gray-400">어제 대비</span>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl text-[12px] font-bold border-2"
            style={{ borderColor: GREEN, color: GREEN }}>
            입력
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-gray-400">이번 달 누적</p>
            <p className="text-[15px] font-bold text-gray-900 mt-0.5">
              {(monthTotal / 10000).toLocaleString()}만원
            </p>
            <ChangeBadge pct={6} up={true} />
            <span className="text-[10px] text-gray-400 ml-1">전월 대비</span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">동종 업종 평균</p>
            <p className="text-[15px] font-bold text-gray-900 mt-0.5">
              {(monthAvg / 10000).toLocaleString()}만원
            </p>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              내 매출 상위 43%
            </span>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5">
          {[180, 240, 310, 290, 260, 288, 324].map((v, i) => {
            const max = 350
            const h = Math.round((v / max) * 40)
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div className="w-full rounded-sm" style={{ height: h, backgroundColor: i === 6 ? GREEN : GREEN + '30' }} />
                <span className="text-[9px] text-gray-300">
                  {['월', '화', '수', '목', '금', '토', '오늘'][i]}
                </span>
              </div>
            )
          })}
        </div>
      </Card>
    </section>
  )
}

// ── 슬롯 ② 이번 주 진행 ───────────────────────────────────

function Slot2Weekly() {
  const stats = [
    { label: '조회', val: 128, pct: 8, up: true },
    { label: '찜', val: 34, pct: 2, up: true },
    { label: '문의', val: 3, pct: -1, up: false },
  ]
  return (
    <section className="mb-5">
      <SlotHeader num="②" title="이번 주 모두 앱" />
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map(s => (
          <Card key={s.label}>
            <p className="text-[11px] text-gray-400 mb-1">{s.label}</p>
            <p className="text-[20px] font-black text-gray-900">{s.val}</p>
            <div className="flex items-center gap-1 mt-1">
              <ChangeBadge pct={s.pct} up={s.up} />
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── 슬롯 ③ 오늘 할 일 ─────────────────────────────────────

function Slot3Todo() {
  const [done, setDone] = useState({ t2: false, t3: false })
  const todos = [
    { id: 't1', label: '오늘 매출 입력하기', done: true, urgent: false },
    { id: 't2', label: '주간 재고 점검', done: done.t2, urgent: false },
    { id: 't3', label: '세금계산서 발행 기한 D-2', done: done.t3, urgent: true },
  ]
  return (
    <section className="mb-5">
      <SlotHeader num="③" title="오늘 할 일" action="전체보기 →" />
      <Card>
        <div className="flex flex-col gap-3">
          {todos.map(t => (
            <button key={t.id}
              onClick={() => !t.done && setDone(p => ({ ...p, [t.id]: true }))}
              className="flex items-center gap-3 text-left">
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: t.done ? GREEN : '#d1d5db',
                  backgroundColor: t.done ? GREEN : 'transparent',
                }}>
                {t.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className={`text-[14px] font-medium ${t.done ? 'line-through text-gray-300' : 'text-gray-800'}`}>
                  {t.label}
                </span>
              </div>
              {t.urgent && !t.done && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 shrink-0">긴급</span>
              )}
            </button>
          ))}
        </div>
        <button className="mt-3.5 pt-3 border-t border-gray-50 w-full text-[13px] font-medium text-center"
          style={{ color: GREEN }}>
          + 할 일 추가
        </button>
      </Card>
    </section>
  )
}

// ── 슬롯 ④ 가게 데이터 완성도 ────────────────────────────

function Slot4Completeness() {
  const items = [
    { label: '업종 · 가게명', done: true },
    { label: '위치 · 주소', done: true },
    { label: '영업시간', done: true },
    { label: '매출 연동', done: false, action: '연동하기' },
    { label: '가게 사진', done: false, action: '추가하기' },
    { label: '대표 메뉴 · 가격', done: false, action: '입력하기' },
  ]
  const score = Math.round(items.filter(i => i.done).length / items.length * 100)

  return (
    <section className="mb-5">
      <SlotHeader num="④" title="가게 프로필 완성도" action="수정하기" />
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-[60px] h-[60px]">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              <circle cx="30" cy="30" r="24" fill="none" stroke={GREEN} strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - score / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 30 30)" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[14px] font-black" style={{ color: GREEN }}>{score}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-gray-700">
              기본 정보는 채워졌어요!
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">
              매출 연동하면 AI 분석이 더 정확해져요
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: item.done ? GREEN : '#e5e7eb' }}>
                {item.done ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                )}
              </div>
              <span className={`flex-1 text-[13px] ${item.done ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                {item.label}
              </span>
              {item.action && (
                <button className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: GREEN_BG, color: GREEN }}>
                  {item.action}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

// ── 슬롯 ⑤ 동종 비교 + 양도 시세 ────────────────────────

function Slot5Market() {
  return (
    <section className="mb-5">
      <SlotHeader num="⑤" title="동종 업종 시장 동향" action="자세히 →" />
      <div className="flex gap-2.5">
        <Card className="flex-1">
          <p className="text-[11px] text-gray-400 mb-2">카페·디저트 · 마포구</p>
          <div className="space-y-2">
            {[
              { label: '월평균 매출', val: '420만원', me: '324만원', meColor: '#f59e0b' },
              { label: '평균 권리금', val: '2,800만원', me: null, meColor: null },
            ].map(r => (
              <div key={r.label}>
                <p className="text-[10px] text-gray-400">{r.label}</p>
                <p className="text-[13px] font-bold text-gray-800">{r.val}</p>
                {r.me && (
                  <p className="text-[10px]" style={{ color: r.meColor }}>내 가게 {r.me}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
        <Card className="flex-1">
          <p className="text-[11px] text-gray-400 mb-2">인근 양도 시세</p>
          <p className="text-[11px] text-gray-500">반경 500m · 카페</p>
          <p className="text-[18px] font-black text-gray-900 mt-1">2,200
            <span className="text-[12px] font-bold ml-0.5">만~</span>
          </p>
          <p className="text-[11px] text-gray-400">최고 3,800만</p>
          <div className="mt-2 pt-2 border-t border-gray-50">
            <p className="text-[10px] text-gray-400">근처 매물 3건</p>
            <button className="text-[11px] font-bold mt-0.5" style={{ color: GREEN }}>
              보러가기 →
            </button>
          </div>
        </Card>
      </div>
    </section>
  )
}

// ── 슬롯 ⑥ 자주 찾는 업체 ────────────────────────────────

const VENDORS = [
  { emoji: '🧮', label: '세무·회계', sub: 'AI 매칭 5건' },
  { emoji: '📱', label: 'POS·키오스크', sub: '비교 중' },
  { emoji: '🛵', label: '배달 플랫폼', sub: '연동 가능' },
  { emoji: '🔧', label: '시설·인테리어', sub: '견적 받기' },
]

function Slot6Vendors({ navigate }) {
  return (
    <section className="mb-5">
      <SlotHeader num="⑥" title="자주 찾는 업체" action="전체 →" />
      <div className="grid grid-cols-4 gap-2">
        {VENDORS.map(v => (
          <button key={v.label}
            onClick={() => navigate('/d4/operating/inbox')}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-gray-100 bg-white active:scale-95 transition-all">
            <span className="text-[22px]">{v.emoji}</span>
            <p className="text-[11px] font-semibold text-gray-800 text-center leading-tight">{v.label}</p>
            <p className="text-[9px] text-center" style={{ color: GREEN }}>{v.sub}</p>
          </button>
        ))}
      </div>
    </section>
  )
}

// ── 슬롯 ⑦ 운영 콘텐츠 ───────────────────────────────────

const CONTENTS = [
  { emoji: '📹', tag: '영상', title: '카페 매출 300만 돌파한 사장님 비결', time: '12분', views: '3.2만' },
  { emoji: '📝', tag: '가이드', title: '2024 자영업자 부가세 신고 핵심 정리', time: '5분', views: '1.8만' },
  { emoji: '📊', tag: '데이터', title: '마포구 카페 업종 상권 분석 리포트', time: '8분', views: '924' },
]

function Slot7Contents() {
  return (
    <section className="mb-5">
      <SlotHeader num="⑦" title="운영 콘텐츠" action="더보기 →" />
      <div className="flex flex-col gap-2.5">
        {CONTENTS.map(c => (
          <Card key={c.title} className="flex items-start gap-3 cursor-pointer active:scale-[0.99] transition-all">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: GREEN_BG }}>
              <span className="text-[18px]">{c.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1 inline-block"
                style={{ backgroundColor: GREEN + '18', color: GREEN }}>{c.tag}</span>
              <p className="text-[13px] font-semibold text-gray-800 leading-snug">{c.title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{c.time} · 조회 {c.views}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── 슬롯 ⑧ 운영 가이드 ───────────────────────────────────

const GUIDES = [
  { emoji: '💰', title: '세금계산서 발행 완벽 가이드', badge: '자영업자 필독' },
  { emoji: '📋', title: '부가세 예정신고 체크리스트 2024', badge: null },
  { emoji: '🏦', title: '소상공인 정책자금 신청 방법', badge: '마감 임박' },
]

function Slot8Guides() {
  return (
    <section className="mb-2">
      <SlotHeader num="⑧" title="운영 가이드" action="전체 →" />
      <div className="flex flex-col gap-2">
        {GUIDES.map(g => (
          <button key={g.title}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-white text-left active:scale-[0.99] transition-all">
            <span className="text-[20px] shrink-0">{g.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 truncate">{g.title}</p>
            </div>
            {g.badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: g.badge.includes('마감') ? '#fef2f2' : GREEN_BG,
                  color: g.badge.includes('마감') ? '#ef4444' : GREEN }}>
                {g.badge}
              </span>
            )}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
              <path d="M5 10l3-3-3-3" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </section>
  )
}

// ── 메인 ─────────────────────────────────────────────────

export default function A7OperatingDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const { toast, showToast } = useToast()

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── 헤더 ── */}
      <header className="shrink-0 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2 px-5 pt-12 pb-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: GREEN }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />
            운영 중
          </div>
          <div className="flex-1" />
          {/* 알림 */}
          <button className="relative w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a5 5 0 015 5v2.5l1 1.5H2l1-1.5V7a5 5 0 015-5z"
                stroke="#6b7280" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M6.5 13a1.5 1.5 0 003 0" stroke="#6b7280" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
          </button>
          {/* 설정 */}
          <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center ml-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="#6b7280" strokeWidth="1.4" />
              <path d="M8 2v1M8 13v1M2 8h1M13 8h1M3.76 3.76l.71.71M11.53 11.53l.71.71M3.76 12.24l.71-.71M11.53 4.47l.71-.71"
                stroke="#6b7280" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 가게 이름 행 */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2">
            <p className="text-[18px] font-black text-gray-900">서교동 고양이 카페</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: GREEN }}>영업중</span>
          </div>
          <p className="text-[12px] text-gray-400 mt-0.5">서울 마포구 서교동 · 카페·디저트</p>
        </div>
      </header>

      {/* ── 스크롤 피드 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6">

          {/* 구분선: 스크롤 전 / 스크롤 후 */}
          <div className="text-[11px] font-bold text-gray-300 mb-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>내 가게 데이터</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <Slot1Sales />
          <Slot2Weekly />
          <Slot3Todo />
          <Slot4Completeness />

          <div className="text-[11px] font-bold text-gray-300 my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>AI 큐레이션</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <Slot5Market />
          <Slot6Vendors navigate={navigate} />
          <Slot7Contents />
          <Slot8Guides />

        </div>
      </main>

      {/* ── 하단 네비 ── */}
      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {NAV_TABS.map(tab => {
            const active = activeNav === tab.id
            return (
              <button key={tab.id}
                onClick={() => {
                  if (tab.id === 'message') { navigate('/d4/operating/inbox'); return }
                  if (tab.id === 'explore' || tab.id === 'community' || tab.id === 'my') {
                    showToast('준비 중이에요'); return
                  }
                  setActiveNav(tab.id)
                }}
                className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
                <tab.Icon active={active} />
                <span className="text-[10px] font-semibold"
                  style={{ color: active ? GREEN : '#9ca3af' }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
      <Toast message={toast} />
    </div>
  )
}
