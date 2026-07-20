import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, getProfiles, CATEGORY_CONFIG } from '../lib/userProfile'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import { ModuMarkHomeButton } from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'
import { useAuth } from '../contexts/AuthContext'

// ── 하단 네비 아이콘 ───────────────────────────────────────
function NavIcon({ type, active, color, bg }) {
  const c = active ? color : '#9ca3af'
  if (type === 'home') return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={active ? bg : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
  if (type === 'explore') return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
  if (type === 'community') return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
  if (type === 'message') return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  if (type === 'my') return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" />
      <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
  return null
}

// ── 공통 UI 블록 ──────────────────────────────────────────
function SectionHeader({ label }) {
  return (
    <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase px-5 pt-6 pb-2">
      {label}
    </p>
  )
}

function Divider() {
  return <div className="h-px bg-gray-50 mx-5" />
}

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Row({ icon, label, value, badge, badgeColor, badgeBg, right, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:bg-gray-50/80 transition-colors">
      {icon && (
        <span className="text-[18px] w-7 shrink-0 text-center leading-none">{icon}</span>
      )}
      <span className={`flex-1 text-[14px] font-medium leading-snug ${danger ? 'text-red-500' : 'text-gray-800'}`}>
        {label}
      </span>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: badgeBg, color: badgeColor }}>
          {badge}
        </span>
      )}
      {value && (
        <span className="text-[12px] text-gray-400 shrink-0">{value}</span>
      )}
      {right !== undefined ? right : <ChevronRight />}
    </button>
  )
}

function Toggle({ on, onChange, color = '#1a4d8f' }) {
  return (
    <button
      onClick={onChange}
      className="w-12 h-6 rounded-full transition-all duration-300 relative shrink-0"
      style={{ backgroundColor: on ? color : '#d1d5db' }}>
      <div
        className="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300 shadow-sm"
        style={{ left: on ? '26px' : '2px' }}
      />
    </button>
  )
}

function ToggleRow({ icon, label, desc, on, onChange, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      {icon && <span className="text-[18px] w-7 shrink-0 text-center leading-none">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-gray-800 leading-snug">{label}</p>
        {desc && <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <Toggle on={on} onChange={onChange} color={color} />
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────
export default function MyPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/a2', { replace: true })
  }

  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile.category] ?? CATEGORY_CONFIG.seller
  const { color, bg, home, message, label: categoryLabel } = config

  const [posOn, setPosOn] = useState(true)
  const [cardOn, setCardOn] = useState(false)
  const [taxOn, setTaxOn] = useState(false)
  const [marketingOn, setMarketingOn] = useState(false)
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const profiles = getProfiles()

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-50">
        <div className="px-5 pt-12 pb-5">
          {/* 카테고리 칩 — 클릭 시 프로필 전환 */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setShowProfileSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-white active:opacity-80"
              style={{ backgroundColor: color }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
              {categoryLabel}
            </button>
            {profiles.length > 0 && (
              <span className="text-[11px] text-gray-400">{profiles.length}개 프로필</span>
            )}
            <button onClick={() => setShowProfileSheet(true)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold text-gray-300 ml-1"
              style={{ border: '1.5px dashed #d1d5db' }}>+</button>
            <div className="flex-1" />
            <ModuMarkHomeButton size={22} color="#1683B8" />
          </div>
          {/* 프로필 요약 */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[24px] font-black text-white shrink-0"
              style={{ backgroundColor: color }}>
              {(profile.name ?? '?')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[18px] font-bold text-gray-900">{profile.name ?? '이름을 설정해주세요'}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">연락처 미등록 · 번호 비공개</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  무료 플랜
                </span>
                {/* 개발용 로그인 상태 배지 — 나중에 제거 */}
                {user !== undefined && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: user ? '#fef3c7' : '#fee2e2', color: user ? '#92400e' : '#991b1b' }}>
                    {user ? `🟡 로그인됨: ${user.email ?? user.id.slice(0, 8)}` : '⚪ 로그아웃 상태'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 스크롤 */}
      <main className="flex-1 overflow-y-auto pb-4" style={{ scrollbarWidth: 'none' }}>

        {/* ── ⓪ 프로필 관리 ── */}
        <SectionHeader label="⓪ 내 프로필 관리" />
        <div className="bg-white">
          {profiles.length === 0 ? (
            <Row icon="👤" label="프로필 없음" value="추가 →" onClick={() => setShowProfileSheet(true)} />
          ) : profiles.map((p, i) => {
            const cfg = CATEGORY_CONFIG[p.category]
            if (!cfg) return null
            return (
              <div key={p.id}>
                <button onClick={() => setShowProfileSheet(true)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:bg-gray-50/80 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-black text-white shrink-0"
                    style={{ backgroundColor: cfg.color }}>
                    {(p.name || cfg.label).slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-gray-800">{p.name || cfg.label}</p>
                    <p className="text-[11px] text-gray-400">{cfg.label}</p>
                  </div>
                  {p.active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}>현재</span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {i < profiles.length - 1 && <div className="h-px bg-gray-50 mx-5" />}
              </div>
            )
          })}
          <div className="h-px bg-gray-50 mx-5" />
          <Row icon="➕" label="프로필 추가" value="다른 카테고리 →" onClick={() => setShowProfileSheet(true)} />
        </div>

        {/* ── ① 멤버십·구독 ── */}
        <SectionHeader label="① 멤버십·구독" />
        <div className="bg-white">
          <div className="mx-5 mb-1 mt-1 rounded-2xl overflow-hidden border"
            style={{ borderColor: `${color}25` }}>
            <div className="px-4 py-3.5" style={{ backgroundColor: bg }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-bold" style={{ color }}>현재 플랜: 무료</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: color, color: 'white' }}>FREE</span>
              </div>
            </div>
          </div>
          <Divider />
          <Row icon="🎁" label="혜택 내역 확인" badgeColor={color} badgeBg={bg} onClick={() => navigate('/my/membership')} />
        </div>

        {/* ── ② 결제 수단 ── */}
        <SectionHeader label="② 결제 수단" />
        <div className="bg-white">
          <Row icon="💳" label="등록된 결제 수단 없음" value="추가 →" onClick={() => navigate('/my/payment-method')} right={null} />
          <Divider />
          <Row icon="🧾" label="결제 내역" onClick={() => navigate('/my/payment-history')} />
        </div>

        {/* ── ③ 계약·약관 동의 내역 ── */}
        <SectionHeader label="③ 계약·약관 동의" />
        <div className="bg-white">
          <Row icon="📋" label="이용약관 동의" value="2024.06.01" onClick={() => navigate('/my/terms')} />
          <Divider />
          <Row icon="🔒" label="개인정보처리방침" value="2024.06.01" onClick={() => navigate('/my/privacy')} />
          <Divider />
          <ToggleRow icon="📢" label="마케팅 수신 동의" desc="이벤트·혜택 알림 수신"
            on={marketingOn} onChange={() => setMarketingOn(v => !v)} color={color} />
        </div>

        {/* ── ④ 데이터 연결 관리 ── */}
        <SectionHeader label="④ 데이터 연결 관리" />
        <div className="bg-white">
          <ToggleRow icon="💰" label="POS 연동" desc="매출 데이터 자동 수집 중"
            on={posOn} onChange={() => setPosOn(v => !v)} color={color} />
          <Divider />
          <ToggleRow icon="💳" label="카드매출 자동 수집" desc="카드사 API 연동"
            on={cardOn} onChange={() => setCardOn(v => !v)} color={color} />
          <Divider />
          <ToggleRow icon="📊" label="세무 데이터 연동" desc="홈택스 간편 조회"
            on={taxOn} onChange={() => setTaxOn(v => !v)} color={color} />
          <Divider />
          <Row icon="🏢" label="사업자등록증 확인" onClick={() => navigate('/my/business-cert')} />

          {/* Push 제안 받기 설정 (v16 게이트1) */}
          <Row icon="📬" label="제안 받기 설정 (게이트 1)"
            value="12개 분류 ON/OFF →"
            badge="설정 중"
            badgeColor={color}
            badgeBg={bg}
            onClick={() => navigate('/my/proposal-settings')} />
        </div>

        {/* ── ⑤ 보안·인증 ── */}
        <SectionHeader label="⑤ 보안·인증" />
        <div className="bg-white">
          <Row icon="✅" label="본인인증" onClick={() => navigate('/my/identity')} />
          <Divider />
          <Row icon="🔑" label="PIN·비밀번호 변경" onClick={() => navigate('/my/pin')} />
          <Divider />
          <Row icon="📱" label="로그인 기기 관리" onClick={() => navigate('/my/devices')} />
        </div>

        {/* ── ⑥ 계정 정보 ── */}
        <SectionHeader label="⑥ 계정 정보" />
        <div className="bg-white">
          <Row icon="👤" label="이름" value={getProfile().name ?? '미설정'} onClick={() => navigate('/my/name')} />
          <Divider />
          {/* 연락처 입력·사업자 인증·소셜 연동 미구현 — 가짜 값 대신 정직한 빈 상태 */}
          <Row icon="📞" label="연락처" value="미등록" onClick={() => showToast('준비 중이에요 🚧')} />
          <Divider />
          <Row icon="🏪" label="사업자 정보" value="미등록" onClick={() => showToast('준비 중이에요 🚧')} />
          <Divider />
          <Row icon="🔗" label="연결된 소셜 계정" value="미연동" onClick={() => showToast('준비 중이에요 🚧')} />
        </div>

        {/* ── ⑦ 고객센터·기타 ── */}
        <SectionHeader label="⑦ 고객센터·기타" />
        <div className="bg-white">
          <Row icon="❓" label="자주 묻는 질문 (FAQ)" onClick={() => navigate('/my/faq')} />
          <Divider />
          <Row icon="📣" label="공지사항" onClick={() => navigate('/my/notice')} />
          <Divider />
          <Row icon="🧪" label="실험실 (베타 기능)" onClick={() => navigate('/my/lab')} />
          <Divider />
          <Row
            icon="📌"
            label="앱 버전"
            value="v0.1.0"
            right={<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">최신</span>}
            onClick={() => {}}
          />
          <Divider />
          <Row icon="🚪" label="로그아웃" onClick={handleSignOut} />
          <Divider />
          <Row label="회원 탈퇴" danger onClick={() => showToast('준비 중이에요 🚧')} right={null} />
        </div>

        {/* 하단 여백 */}
        <div className="h-2" />
      </main>

      {/* ── 하단 네비 (마이 활성) ── */}
      <nav className="shrink-0 bg-white border-t border-gray-100 flex">
        {[
          { id: 'home',      label: '홈',     onClick: () => navigate(home) },
          { id: 'explore',   label: '탐색',   onClick: () => navigate('/explore') },
          { id: 'community', label: '커뮤니티', onClick: () => navigate('/community') },
          { id: 'message',   label: '메시지', onClick: message ? () => navigate(message) : () => showToast('준비 중이에요 🚧') },
          { id: 'my',        label: '마이',   onClick: () => {}, active: true },
        ].map(tab => (
          <button key={tab.id}
            onClick={tab.onClick}
            className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors">
            <span className="relative">
              <NavIcon type={tab.id} active={!!tab.active} color={color} bg={bg} />
              {tab.id === 'message' && <MessageTabDot />}
            </span>
            <span className="text-[10px] font-medium"
              style={{ color: tab.active ? color : '#9ca3af' }}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      <Toast message={toast} />
      <ProfileSwitchSheet isOpen={showProfileSheet} onClose={() => setShowProfileSheet(false)} />
    </div>
  )
}
