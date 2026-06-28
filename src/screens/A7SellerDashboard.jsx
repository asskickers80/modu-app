import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile } from '../lib/userProfile'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const GREEN = '#22c55e'

// ── 하단 네비 아이콘 ───────────────────────────────────────
function HomeIcon({ active }) {
  const c = active ? NAVY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round"
        fill={active ? NAVY_BG : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? NAVY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? NAVY : '#9ca3af'
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
  const c = active ? NAVY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? NAVY : '#9ca3af'
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

// ── 더미 데이터 ──────────────────────────────────────────
const MARKET_CARDS = [
  { title: '인근 카페 평균 권리금', value: '3,200만원', change: '↑8% 전월비' },
  { title: '서울 카페 이번 달 거래', value: '43건', change: '↑5% 전월비' },
  { title: '홍대 유동인구', value: '↑22%', change: '주말 기준' },
]

const BIZ_CARDS = [
  { id: 'biz1', name: '빠른인테리어', desc: '양도 후 인테리어 전문', emoji: '🔨', badge: '추천' },
  { id: 'biz2', name: '권리금연구소', desc: '감정평가 무료상담', emoji: '📊', badge: '' },
  { id: 'biz3', name: '모두공인중개', desc: '양도 전문 중개', emoji: '🏠', badge: '파트너' },
]

const ARTICLES = [
  { id: 'art1', title: '권리금 협상, 이렇게 하면 유리해요', views: '1,234', time: '5분' },
  { id: 'art2', title: '양도계약서 전 꼭 확인할 5가지', views: '892', time: '3분' },
  { id: 'art3', title: '조회수 올리는 매물 사진 찍는 법', views: '654', time: '4분' },
]

const GUIDE_STEPS = [
  { step: '매물 등록', done: true, target: null },
  { step: '사진 3장 추가하기', done: false, current: true, target: '/e1/4' },
  { step: '가격 협의', done: false, target: null },
  { step: '계약서 작성', done: false, target: null },
  { step: '잔금·이전 완료', done: false, target: null },
]

// ── 컴포넌트 ─────────────────────────────────────────────
function UpArrow() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="inline">
      <path d="M5.5 2v7M2.5 5L5.5 2l3 3" stroke={GREEN} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function A7SellerDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const { toast, showToast } = useToast()
  const profile = getProfile()
  const bizLabel = profile.bizType ?? '내 가게'
  const regionLabel = profile.region ?? '지역 미설정'
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── 상단 프로필 칩 헤더 ── */}
      <header className="shrink-0 px-5 pt-12 pb-3 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2">
          {/* 양도자 네이비 알약 */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: NAVY }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />
            양도자
          </div>
          {/* 프로필 추가 */}
          <button
            onClick={() => showToast()}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[15px] font-bold text-gray-300"
            style={{ border: '2px dashed #d1d5db' }}>
            +
          </button>
          <div className="flex-1" />
          {/* 더보기 */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className="text-gray-400 text-[20px] leading-none tracking-widest">
            ···
          </button>
        </div>
      </header>

      {/* ── 스크롤 영역 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-5 pt-5 pb-4">

          {/* 인사 */}
          <div className="mb-5">
            <p className="text-[13px] text-gray-400">안녕하세요 👋</p>
            <h2 className="text-[21px] font-bold text-gray-900 mt-0.5 leading-snug">
              {bizLabel} 양도 준비 중
            </h2>
            <p className="text-[13px] text-gray-400 mt-0.5">{regionLabel} 지역</p>
          </div>

          {/* E1 진입 CTA — 매물 등록·수정 */}
          <button
            onClick={() => navigate('/e1/1')}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 mb-4 active:scale-[0.99] transition-all"
            style={{ backgroundColor: NAVY }}>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-bold text-white">매물 등록 · 수정하기</p>
              <p className="text-[12px] text-white/60 mt-0.5">기본 팩트 입력 → AI 초안 → 공개</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6 3l6 6-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* ① 이번 달 매출 */}
          <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: '#f7f9ff', border: '1px solid #e0e8f9' }}>
            <p className="text-[12px] font-medium text-gray-400 mb-1">이번 달 매출</p>
            <div className="flex items-end gap-2">
              <span className="text-[30px] font-bold text-gray-900 leading-none">2,840만원</span>
              <span className="text-[13px] font-bold mb-0.5 flex items-center gap-0.5" style={{ color: GREEN }}>
                <UpArrow /> 12%
              </span>
            </div>
            <p className="text-[12px] text-gray-400 mt-1.5">지난달보다 340만원 더 들어왔어요</p>
          </div>

          {/* ② 조회·관심·문의 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: '조회', value: '128', sub: '+15 오늘', navy: false },
              { label: '관심', value: '34', sub: '', navy: false },
              { label: '문의', value: '7', sub: '↑3 이번 주', navy: true },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => item.navy ? navigate('/d4/inbox') : showToast()}
                className="rounded-2xl border border-gray-100 p-3 text-center active:scale-[0.98] transition-transform"
                style={item.navy ? { backgroundColor: NAVY_BG, borderColor: `${NAVY}30` } : {}}>
                <p className="text-[24px] font-bold leading-none"
                  style={{ color: item.navy ? NAVY : '#111827' }}>{item.value}</p>
                <p className="text-[11px] text-gray-400 mt-1">{item.label}</p>
                {item.sub && (
                  <p className="text-[10px] font-semibold mt-0.5"
                    style={{ color: item.navy ? NAVY : '#9ca3af' }}>{item.sub}</p>
                )}
              </button>
            ))}
          </div>

          {/* ③ 새 문의 + 진지도 → D4 inbox */}
          <button
            onClick={() => navigate('/d4/inbox')}
            className="w-full rounded-2xl p-4 mb-3 text-left active:scale-[0.99] transition-transform"
            style={{ backgroundColor: NAVY_BG, border: `1.5px solid ${NAVY}25` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NAVY }} />
                  <p className="text-[14px] font-bold" style={{ color: NAVY }}>새 문의 3건 도착</p>
                </div>
                <p className="text-[13px] text-gray-600">
                  진지도 🔥🔥🔥 <span className="font-semibold">높음</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">진지한 구매자 비율이 평균보다 높아요</p>
              </div>
              <span className="text-[13px] font-bold mt-0.5 shrink-0" style={{ color: NAVY }}>확인 →</span>
            </div>
          </button>

          {/* ④ 매물 완성도 → E1 진입점 */}
          <div
            role="button"
            onClick={() => navigate('/e1/1')}
            className="rounded-2xl border border-gray-100 p-4 mb-7 cursor-pointer active:scale-[0.99] transition-transform"
            style={{ backgroundColor: '#fafbff' }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[13px] font-semibold text-gray-700">내 매물 완성도</p>
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-bold" style={{ color: NAVY }}>72%</p>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: NAVY_BG, color: NAVY }}>수정 →</span>
              </div>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: '72%', backgroundColor: NAVY }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              💡 사진 3장 추가하면 90%까지 올라가요 · 탭해서 매물 수정
            </p>
          </div>

          {/* 내 공개 매물 — 양수자 눈으로 보기 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📋 내 공개 매물</p>
              <button
                onClick={() => navigate('/e2/t1')}
                className="text-[12px] font-medium" style={{ color: NAVY }}>
                양수자 화면 보기 →
              </button>
            </div>
            <button
              onClick={() => navigate('/e2/t1')}
              className="w-full rounded-2xl border overflow-hidden text-left active:scale-[0.99] transition-transform"
              style={{ borderColor: `${NAVY}30` }}>
              <div className="h-[80px] flex items-center justify-center relative"
                style={{ background: 'linear-gradient(135deg, #b8cce8, #8aacd8)' }}>
                <span className="text-[32px]">🐱</span>
                <span className="absolute top-2 left-3 text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                  style={{ backgroundColor: NAVY }}>영업양도</span>
                <span className="absolute top-2 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: 'rgba(255,255,255,0.85)', color: NAVY }}>공개 중</span>
              </div>
              <div className="px-4 py-3" style={{ backgroundColor: NAVY_BG }}>
                <p className="text-[14px] font-bold text-gray-900">홍대 고양이 카페</p>
                <p className="text-[12px] text-gray-500 mt-0.5">권리금 2,500만 · 서울 마포구 서교동</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-gray-400">조회 128</span>
                  <span className="text-[11px] text-gray-400">관심 34</span>
                  <span className="text-[11px] text-gray-400">문의 7</span>
                  <span className="ml-auto text-[11px] font-semibold" style={{ color: NAVY }}>
                    양수자 뷰 미리보기 →
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* AI 큐레이션 구분선 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[12px] font-semibold text-gray-400">✨ AI 맞춤 정보</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ⑤ 동종 시장 동향 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📈 동종 시장 동향</p>
              <button
                onClick={() => navigate('/seller/market')}
                className="text-[12px] font-medium text-gray-400">전체보기 →</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {MARKET_CARDS.map(card => (
                <button key={card.title}
                  onClick={() => navigate('/seller/market')}
                  className="shrink-0 w-[140px] rounded-2xl border border-gray-100 p-3.5 text-left active:scale-[0.98] transition-transform">
                  <p className="text-[11px] text-gray-400 mb-2 leading-snug">{card.title}</p>
                  <p className="text-[17px] font-bold text-gray-900">{card.value}</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: GREEN }}>{card.change}</p>
                </button>
              ))}
            </div>
          </section>

          {/* ⑥ 거래처·지원 업체 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">🏢 거래처·지원 업체</p>
              <button
                onClick={() => navigate('/seller/companies')}
                className="text-[12px] font-medium text-gray-400">전체보기 →</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {BIZ_CARDS.map(co => (
                <button key={co.name}
                  onClick={() => navigate(`/seller/company/${co.id}`)}
                  className="shrink-0 w-[140px] rounded-2xl border border-gray-100 p-3.5 text-left active:scale-[0.98] transition-transform">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[26px] leading-none">{co.emoji}</span>
                    {co.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: NAVY_BG, color: NAVY }}>{co.badge}</span>
                    )}
                  </div>
                  <p className="text-[13px] font-bold text-gray-800">{co.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{co.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* ⑦ 양도자 콘텐츠 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📝 양도자 필독</p>
              <button
                onClick={() => navigate('/seller/articles')}
                className="text-[12px] font-medium text-gray-400">더보기 →</button>
            </div>
            <div className="flex flex-col">
              {ARTICLES.map((a, i) => (
                <button
                  key={a.title}
                  onClick={() => navigate(`/seller/article/${a.id}`)}
                  className={`flex items-center justify-between py-3.5 text-left active:bg-gray-50 transition-colors ${i < ARTICLES.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="flex-1 pr-3">
                    <p className="text-[13px] font-semibold text-gray-800 leading-snug">{a.title}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      조회 {a.views} · {a.time} 읽기
                    </p>
                  </div>
                  <span className="text-gray-300 text-[18px] leading-none">›</span>
                </button>
              ))}
            </div>
          </section>

          {/* ⑧ 양도 가이드 */}
          <section className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">🗺️ 양도 진행 가이드</p>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {GUIDE_STEPS.map((item, i) => {
                const clickable = item.current && item.target
                return (
                  <div
                    key={item.step}
                    role={clickable ? 'button' : undefined}
                    onClick={() => {
                      if (clickable) navigate(item.target)
                    }}
                    className={`flex items-center gap-3 px-4 py-3.5 ${i < GUIDE_STEPS.length - 1 ? 'border-b border-gray-50' : ''} ${clickable ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
                    style={item.current ? { backgroundColor: NAVY_BG } : {}}>
                    <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{
                        backgroundColor: item.done ? GREEN : item.current ? NAVY : '#e5e7eb',
                        color: 'white',
                      }}>
                      {item.done ? '✓' : item.current ? '→' : ''}
                    </div>
                    <span className={`text-[13px] flex-1 ${item.done ? 'line-through text-gray-300' : item.current ? 'font-bold' : 'text-gray-400'}`}
                      style={item.current ? { color: NAVY } : {}}>
                      {item.step}
                    </span>
                    {item.current && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: NAVY, color: 'white' }}>
                        {item.target ? '탭하여 추가 →' : '진행 중'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

        </div>
      </main>

      {/* ── 하단 네비게이션 5탭 ── */}
      <nav className="shrink-0 bg-white border-t border-gray-100 flex">
        {NAV_TABS.map(({ id, label, Icon }) => {
          const active = activeNav === id
          return (
            <button
              key={id}
              onClick={() => {
                if (id === 'home') return
                if (id === 'explore') { navigate('/explore'); return }
                if (id === 'community') { navigate('/community'); return }
                if (id === 'message') { navigate('/d4/inbox'); return }
                if (id === 'my') { navigate('/my'); return }
              }}
              className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors"
            >
              <Icon active={active} />
              <span className="text-[10px] font-medium"
                style={{ color: active ? NAVY : '#9ca3af' }}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      <Toast message={toast} />

      {/* ── ··· 더보기 바텀시트 ── */}
      {showMoreMenu && (
        <div className="absolute inset-0 z-50" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-3 pb-8"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[14px] font-bold text-gray-900 mb-4">더보기</p>
            {[
              { icon: '🔗', label: '링크 복사', action: () => { setShowMoreMenu(false); showToast('링크 복사됨 ✓') } },
              { icon: '📤', label: '공유하기', action: () => { setShowMoreMenu(false); showToast('공유 기능 준비 중 🚧') } },
              { icon: '✏️', label: '매물 수정하기', action: () => { setShowMoreMenu(false); navigate('/e1/1') } },
              { icon: '🙈', label: '매물 임시 숨기기', action: () => { setShowMoreMenu(false); showToast() } },
              { icon: '📊', label: '시장 동향 보기', action: () => { setShowMoreMenu(false); navigate('/seller/market') } },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0 text-left active:bg-gray-50 transition-colors">
                <span className="text-[20px] w-8 text-center">{item.icon}</span>
                <span className="text-[14px] font-medium text-gray-800">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
