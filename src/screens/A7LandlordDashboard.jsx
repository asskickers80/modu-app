import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile } from '../lib/userProfile'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'
const GREEN = '#22c55e'

function HomeIcon({ active }) {
  const c = active ? TEAL : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round"
        fill={active ? TEAL_BG : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? TEAL : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? TEAL : '#9ca3af'
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
  const c = active ? TEAL : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? TEAL : '#9ca3af'
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

const MARKET_CARDS = [
  { title: '서울 소형 상가 월세', value: '185만원', change: '↑3% 전월비' },
  { title: '공실률 (서울 평균)', value: '6.2%', change: '↓0.4%p 전월비' },
  { title: '임대 문의 이번 달', value: '34건', change: '↑12% 전월비' },
]

const BIZ_CARDS = [
  { name: '모두공인중개', desc: '상가 임대·매매 전문', emoji: '🏠', badge: '파트너' },
  { name: '인테리어파트너', desc: '인테리어 공사 무료견적', emoji: '🔨', badge: '추천' },
  { name: '법무사무소', desc: '임대차계약서 검토', emoji: '⚖️', badge: '' },
]

const ARTICLES = [
  { title: '상가 임대차보호법 이렇게 바뀌었어요', views: '2,341', time: '6분' },
  { title: '권리금 없이도 좋은 임차인 찾는 법', views: '1,102', time: '4분' },
  { title: '공실 기간 줄이는 임대 조건 설정 팁', views: '876', time: '3분' },
]

const GUIDE_STEPS = [
  { step: '상가 등록', done: true },
  { step: '도면 사진 추가', done: false, current: true },
  { step: '임차인 문의 응대', done: false },
  { step: '조건 협의', done: false },
  { step: '계약서 작성', done: false },
]

// 더미 자산 카드
const ASSETS = [
  { id: 1, addr: '서울 마포구 서교동 332-4', floor: '1층', area: '45㎡', status: '공실', deposit: 5000, monthly: 180 },
  { id: 2, addr: '서울 마포구 합정동 91-3', floor: '2층', area: '60㎡', status: '임대 중', deposit: 3000, monthly: 150 },
]

function UpArrow() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="inline">
      <path d="M5.5 2v7M2.5 5L5.5 2l3 3" stroke={GREEN} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function A7LandlordDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const profile = getProfile()
  const regionLabel = profile.region ?? '지역 미설정'
  const { toast, showToast } = useToast()

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── 상단 헤더 ── */}
      <header className="shrink-0 px-5 pt-12 pb-3 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: TEAL }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />
            임대인
          </div>
          <button className="w-7 h-7 rounded-full flex items-center justify-center text-[15px] font-bold text-gray-300"
            style={{ border: '2px dashed #d1d5db' }}>
            +
          </button>
          <div className="flex-1" />
          <button className="text-gray-400 text-[20px] leading-none tracking-widest">···</button>
        </div>
      </header>

      {/* ── 스크롤 영역 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-5 pt-5 pb-4">

          {/* 인사 */}
          <div className="mb-5">
            <p className="text-[13px] text-gray-400">안녕하세요 👋</p>
            <h2 className="text-[21px] font-bold text-gray-900 mt-0.5 leading-snug">
              상가 임대 관리 중
            </h2>
            <p className="text-[13px] text-gray-400 mt-0.5">{regionLabel} 일대</p>
          </div>

          {/* E1' 진입 CTA */}
          <button
            onClick={() => navigate('/e1p/1')}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 mb-4 active:scale-[0.99] transition-all"
            style={{ backgroundColor: TEAL }}>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-bold text-white">상가 등록 · 수정하기</p>
              <p className="text-[12px] text-white/60 mt-0.5">주소 입력 → AI 초안 → 공개</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6 3l6 6-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* ① 자산 현황 */}
          <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: TEAL_BG, border: `1px solid ${TEAL}20` }}>
            <p className="text-[12px] font-medium mb-1" style={{ color: TEAL }}>보유 자산</p>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-[30px] font-bold text-gray-900 leading-none">2개</span>
              <span className="text-[13px] font-bold mb-0.5 flex items-center gap-0.5" style={{ color: GREEN }}>
                <UpArrow /> 이번 달 등록
              </span>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-[13px] text-gray-600">공실 <strong>1개</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GREEN }} />
                <span className="text-[13px] text-gray-600">임대 중 <strong>1개</strong></span>
              </div>
            </div>
          </div>

          {/* ② 조회·관심·문의 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: '조회', value: '94', sub: '+11 오늘', teal: false },
              { label: '관심', value: '21', sub: '', teal: false },
              { label: '문의', value: '5', sub: '↑2 이번 주', teal: true },
            ].map(item => (
              <div key={item.label}
                className="rounded-2xl border border-gray-100 p-3 text-center"
                style={item.teal ? { backgroundColor: TEAL_BG, borderColor: `${TEAL}30` } : {}}>
                <p className="text-[24px] font-bold leading-none"
                  style={{ color: item.teal ? TEAL : '#111827' }}>{item.value}</p>
                <p className="text-[11px] text-gray-400 mt-1">{item.label}</p>
                {item.sub && (
                  <p className="text-[10px] font-semibold mt-0.5"
                    style={{ color: item.teal ? TEAL : '#9ca3af' }}>{item.sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* ③ 임차·매수 문의 분기 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div onClick={() => navigate('/d4/landlord/inbox')}
              className="rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
              style={{ backgroundColor: TEAL_BG, border: `1.5px solid ${TEAL}25` }}>
              <p className="text-[12px] text-gray-400 mb-1">임차 문의</p>
              <p className="text-[24px] font-bold leading-none" style={{ color: TEAL }}>3건</p>
              <p className="text-[11px] mt-1.5" style={{ color: TEAL }}>진지도 🔥🔥 높음</p>
              <p className="text-[11px] text-gray-400 mt-0.5 font-semibold">확인 →</p>
            </div>
            <div onClick={() => navigate('/d4/landlord/inbox')}
              className="rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
              style={{ backgroundColor: '#fef9f0', border: '1.5px solid #f0d080' }}>
              <p className="text-[12px] text-gray-400 mb-1">매수 문의</p>
              <p className="text-[24px] font-bold leading-none" style={{ color: '#b07000' }}>2건</p>
              <p className="text-[11px] mt-1.5" style={{ color: '#b07000' }}>진지도 🔥 보통</p>
              <p className="text-[11px] text-gray-400 mt-0.5 font-semibold">확인 →</p>
            </div>
          </div>

          {/* ④ 자산별 카드 */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">자산별 현황</p>
              <button onClick={() => navigate('/e1p/1')} className="text-[12px] font-medium" style={{ color: TEAL }}>+ 상가 추가</button>
            </div>
            <div className="flex flex-col gap-2">
              {ASSETS.map(asset => (
                <div key={asset.id}
                  onClick={() => navigate('/e1p/1')}
                  role="button"
                  className="rounded-2xl border border-gray-100 p-4 cursor-pointer active:scale-[0.99] transition-all"
                  style={{ backgroundColor: '#fafbff' }}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[13px] font-semibold text-gray-700 flex-1 pr-2">{asset.addr}</p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: asset.status === '공실' ? '#fef2f2' : '#dcfce7',
                        color: asset.status === '공실' ? '#ef4444' : '#16a34a',
                      }}>
                      {asset.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-400 mb-2">{asset.floor} · {asset.area}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-gray-700">
                      보증 <strong>{asset.deposit.toLocaleString()}만</strong>
                    </span>
                    <span className="text-gray-200">·</span>
                    <span className="text-[13px] text-gray-700">
                      월 <strong>{asset.monthly}만</strong>
                    </span>
                    <div className="flex-1" />
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: TEAL_BG, color: TEAL }}>
                      수정 →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI 큐레이션 구분선 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[12px] font-semibold text-gray-400">✨ AI 맞춤 정보</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ⑤ 임대 시장 동향 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📈 임대 시장 동향</p>
              <button onClick={() => showToast('시장 동향 상세 준비 중이에요 🚧')} className="text-[12px] font-medium text-gray-400">전체보기 →</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {MARKET_CARDS.map(card => (
                <div key={card.title}
                  className="shrink-0 w-44 rounded-2xl border border-gray-100 p-3.5">
                  <p className="text-[11px] text-gray-400 mb-2 leading-tight">{card.title}</p>
                  <p className="text-[22px] font-bold text-gray-900 leading-none">{card.value}</p>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: GREEN }}>{card.change}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ⑥ 관련 업체 추천 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">🤝 관련 업체</p>
              <button onClick={() => navigate('/seller/companies')} className="text-[12px] font-medium text-gray-400">더보기 →</button>
            </div>
            <div className="flex flex-col gap-2">
              {BIZ_CARDS.map(b => (
                <div key={b.name} onClick={() => showToast('준비 중이에요 🚧')}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-gray-100 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[20px] shrink-0"
                    style={{ backgroundColor: TEAL_BG }}>
                    {b.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900">{b.name}</p>
                    <p className="text-[12px] text-gray-400 mt-0.5">{b.desc}</p>
                  </div>
                  {b.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: TEAL_BG, color: TEAL }}>
                      {b.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ⑦ 관심 콘텐츠 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📰 임대인 필독</p>
              <button onClick={() => navigate('/seller/articles')} className="text-[12px] font-medium text-gray-400">더보기 →</button>
            </div>
            <div className="flex flex-col gap-2">
              {ARTICLES.map(a => (
                <div key={a.title} onClick={() => navigate('/seller/articles')}
                  className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 cursor-pointer">
                  <div className="w-10 h-10 rounded-2xl shrink-0"
                    style={{ background: `linear-gradient(135deg, ${TEAL_BG}, #d0eeee)` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2">{a.title}</p>
                    <p className="text-[11px] text-gray-400 mt-1">조회 {a.views} · {a.time} 읽기</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ⑧ 임대 가이드 */}
          <section className="mb-4">
            <p className="text-[14px] font-bold text-gray-900 mb-3">📋 임대 진행 단계</p>
            <div className="relative pl-5">
              {GUIDE_STEPS.map((s, i) => (
                <div key={s.step} className="flex items-start gap-3 pb-4 last:pb-0">
                  <div className="absolute left-0 top-0 bottom-0 w-px"
                    style={{ backgroundColor: '#e5e7eb', marginTop: '10px' }} />
                  <div className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: s.done ? TEAL : s.current ? TEAL_BG : '#e5e7eb',
                      border: s.current ? `2px solid ${TEAL}` : 'none',
                    }}>
                    {s.done ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: s.current ? TEAL : '#9ca3af' }} />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold"
                      style={{ color: s.done ? '#6b7280' : s.current ? TEAL : '#9ca3af' }}>
                      {s.step}
                    </p>
                    {s.current && (
                      <p className="text-[11px] mt-0.5" style={{ color: TEAL }}>← 지금 여기</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

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
                  if (tab.id === 'message') { navigate('/d4/landlord/inbox'); return }
                  if (tab.id === 'explore') { navigate('/explore'); return }
                  if (tab.id === 'community') { navigate('/community'); return }
                  if (tab.id === 'my') { navigate('/my'); return }
                  setActiveNav(tab.id)
                }}
                className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
                <tab.Icon active={active} />
                <span className="text-[10px] font-semibold"
                  style={{ color: active ? TEAL : '#9ca3af' }}>
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
