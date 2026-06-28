import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

// ── 하단 네비 아이콘 ───────────────────────────────────────
function NavIcon({ type, active }) {
  const c = active ? NAVY : '#9ca3af'
  if (type === 'home') return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={active ? NAVY_BG : 'none'} />
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

function Row({ icon, label, value, badge, right, onClick, danger = false }) {
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
          style={{ backgroundColor: NAVY_BG, color: NAVY }}>
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

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      className="w-12 h-6 rounded-full transition-all duration-300 relative shrink-0"
      style={{ backgroundColor: on ? NAVY : '#d1d5db' }}>
      <div
        className="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300 shadow-sm"
        style={{ left: on ? '26px' : '2px' }}
      />
    </button>
  )
}

function ToggleRow({ icon, label, desc, on, onChange }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      {icon && <span className="text-[18px] w-7 shrink-0 text-center leading-none">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-gray-800 leading-snug">{label}</p>
        {desc && <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────
export default function MyPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  // ④ 데이터 연결 토글 상태
  const [posOn, setPosOn] = useState(true)
  const [cardOn, setCardOn] = useState(false)
  const [taxOn, setTaxOn] = useState(false)
  // ④ 제안 받기 (Push 게이트1)
  const [pushBiz, setPushBiz] = useState(true)
  const [pushMatch, setPushMatch] = useState(true)
  // ③ 마케팅 수신
  const [marketingOn, setMarketingOn] = useState(false)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-50">
        <div className="px-5 pt-12 pb-5">
          {/* 양도자 칩 */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-white"
              style={{ backgroundColor: NAVY }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
              양도자
            </div>
          </div>
          {/* 프로필 요약 */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[24px] font-black text-white shrink-0"
              style={{ backgroundColor: NAVY }}>
              홍
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[18px] font-bold text-gray-900">홍길동</p>
              <p className="text-[12px] text-gray-400 mt-0.5">010-****-1234 · 번호 비공개</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  무료 플랜
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                  본인인증 완료
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 스크롤 */}
      <main className="flex-1 overflow-y-auto pb-4" style={{ scrollbarWidth: 'none' }}>

        {/* ── ① 멤버십·구독 ── */}
        <SectionHeader label="① 멤버십·구독" />
        <div className="bg-white">
          {/* 프리미엄 CTA */}
          <div className="mx-5 mb-1 mt-1 rounded-2xl overflow-hidden border"
            style={{ borderColor: `${NAVY}25` }}>
            <div className="px-4 py-3.5" style={{ backgroundColor: NAVY_BG }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-bold" style={{ color: NAVY }}>현재 플랜: 무료</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: NAVY, color: 'white' }}>FREE</span>
              </div>
              <p className="text-[12px] text-gray-500 mb-3">
                프리미엄 전환 시 노출 우선순위 상승·차별화 AI 설명·진지도 우선 매칭
              </p>
              <button
                onClick={() => showToast()}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
                style={{ backgroundColor: NAVY }}>
                프리미엄으로 업그레이드 →
              </button>
            </div>
          </div>
          <Divider />
          <Row icon="🎁" label="혜택 내역 확인" onClick={() => showToast()} />
        </div>

        {/* ── ② 결제 수단 ── */}
        <SectionHeader label="② 결제 수단" />
        <div className="bg-white">
          <Row icon="💳" label="등록된 결제 수단 없음" value="추가 →" onClick={() => showToast()} right={null} />
          <Divider />
          <Row icon="🧾" label="결제 내역" onClick={() => showToast()} />
        </div>

        {/* ── ③ 계약·약관 동의 내역 ── */}
        <SectionHeader label="③ 계약·약관 동의" />
        <div className="bg-white">
          <Row icon="📋" label="이용약관 동의" value="2024.06.01" onClick={() => showToast()} />
          <Divider />
          <Row icon="🔒" label="개인정보처리방침" value="2024.06.01" onClick={() => showToast()} />
          <Divider />
          <ToggleRow
            icon="📢"
            label="마케팅 수신 동의"
            desc="이벤트·혜택 알림 수신"
            on={marketingOn}
            onChange={() => setMarketingOn(v => !v)}
          />
        </div>

        {/* ── ④ 데이터 연결 관리 ── */}
        <SectionHeader label="④ 데이터 연결 관리" />
        <div className="bg-white">
          <ToggleRow
            icon="💰"
            label="POS 연동"
            desc="매출 데이터 자동 수집 중"
            on={posOn}
            onChange={() => setPosOn(v => !v)}
          />
          <Divider />
          <ToggleRow
            icon="💳"
            label="카드매출 자동 수집"
            desc="카드사 API 연동"
            on={cardOn}
            onChange={() => setCardOn(v => !v)}
          />
          <Divider />
          <ToggleRow
            icon="📊"
            label="세무 데이터 연동"
            desc="홈택스 간편 조회"
            on={taxOn}
            onChange={() => setTaxOn(v => !v)}
          />
          <Divider />
          <Row icon="🏢" label="사업자등록증 확인" badge="인증완료" onClick={() => showToast()} />

          {/* Push 제안 받기 설정 (v16 게이트1) */}
          <div className="mx-5 my-3 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <p className="text-[11px] font-bold text-gray-500">📬 제안 받기 설정</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                기업회원이 내게 먼저 제안을 보낼 수 있어요 — 분류별로 ON/OFF
              </p>
            </div>
            <div className="divide-y divide-gray-50 bg-white">
              <ToggleRow
                label="업체 제안 받기"
                desc="인테리어·세무·중개 등"
                on={pushBiz}
                onChange={() => setPushBiz(v => !v)}
              />
              <ToggleRow
                label="AI 매칭 제안 받기"
                desc="AI가 고른 양수자 연결"
                on={pushMatch}
                onChange={() => setPushMatch(v => !v)}
              />
            </div>
          </div>
        </div>

        {/* ── ⑤ 보안·인증 ── */}
        <SectionHeader label="⑤ 보안·인증" />
        <div className="bg-white">
          <Row icon="✅" label="본인인증" badge="완료" onClick={() => showToast()} />
          <Divider />
          <Row icon="🔑" label="PIN·비밀번호 변경" onClick={() => showToast()} />
          <Divider />
          <Row icon="📱" label="로그인 기기 관리" onClick={() => showToast()} />
        </div>

        {/* ── ⑥ 계정 정보 ── */}
        <SectionHeader label="⑥ 계정 정보" />
        <div className="bg-white">
          <Row icon="👤" label="이름" value="홍길동" onClick={() => showToast()} />
          <Divider />
          <Row icon="📞" label="연락처" value="010-****-1234" onClick={() => showToast()} />
          <Divider />
          <Row icon="🏪" label="사업자 정보" value="등록완료" onClick={() => showToast()} />
          <Divider />
          <Row icon="🔗" label="연결된 소셜 계정" value="카카오" onClick={() => showToast()} />
        </div>

        {/* ── ⑦ 고객센터·기타 ── */}
        <SectionHeader label="⑦ 고객센터·기타" />
        <div className="bg-white">
          <Row icon="❓" label="자주 묻는 질문 (FAQ)" onClick={() => showToast()} />
          <Divider />
          <Row icon="📣" label="공지사항" onClick={() => showToast()} />
          <Divider />
          <Row icon="🧪" label="실험실 (베타 기능)" onClick={() => showToast()} />
          <Divider />
          <Row
            icon="📌"
            label="앱 버전"
            value="v0.1.0"
            right={<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">최신</span>}
            onClick={() => {}}
          />
          <Divider />
          <Row icon="🚪" label="로그아웃" onClick={() => showToast('준비 중이에요 🚧')} />
          <Divider />
          <Row label="회원 탈퇴" danger onClick={() => showToast('준비 중이에요 🚧')} right={null} />
        </div>

        {/* 하단 여백 */}
        <div className="h-2" />
      </main>

      {/* ── 하단 네비 (마이 활성) ── */}
      <nav className="shrink-0 bg-white border-t border-gray-100 flex">
        {[
          { id: 'home',      label: '홈',     onClick: () => navigate('/a7/seller') },
          { id: 'explore',   label: '탐색',   onClick: () => showToast() },
          { id: 'community', label: '커뮤니티', onClick: () => showToast() },
          { id: 'message',   label: '메시지', onClick: () => navigate('/d4/inbox') },
          { id: 'my',        label: '마이',   onClick: () => {}, active: true },
        ].map(tab => (
          <button key={tab.id}
            onClick={tab.onClick}
            className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors">
            <NavIcon type={tab.id} active={!!tab.active} />
            <span className="text-[10px] font-medium"
              style={{ color: tab.active ? NAVY : '#9ca3af' }}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      <Toast message={toast} />
    </div>
  )
}
