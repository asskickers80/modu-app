import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, saveProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import ComingSoon from '../components/common/ComingSoon'

function useCategoryTheme() {
  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile?.category] ?? CATEGORY_CONFIG.seller
  return { NAVY: config.color, NAVY_BG: config.bg }
}

const SECTION_META = {
  membership:      { title: '멤버십·구독', emoji: '🎁' },
  'payment-method':{ title: '결제 수단',   emoji: '💳' },
  'payment-history':{ title: '결제 내역',  emoji: '🧾' },
  terms:           { title: '이용약관',     emoji: '📋' },
  privacy:         { title: '개인정보처리방침', emoji: '🔒' },
  'business-cert': { title: '사업자등록증', emoji: '🏢' },
  identity:        { title: '본인인증',     emoji: '✅' },
  pin:             { title: 'PIN·비밀번호', emoji: '🔑' },
  devices:         { title: '로그인 기기 관리', emoji: '📱' },
  name:            { title: '이름 변경',    emoji: '👤' },
  contact:         { title: '연락처 변경',  emoji: '📞' },
  'business-info': { title: '사업자 정보',  emoji: '🏪' },
  social:          { title: '연결된 소셜 계정', emoji: '🔗' },
  faq:             { title: '자주 묻는 질문', emoji: '❓' },
  notice:          { title: '공지사항',     emoji: '📣' },
  lab:             { title: '실험실 (베타)', emoji: '🧪' },
}

// ── 섹션별 콘텐츠 ──────────────────────────────────────────
function MembershipContent({ showToast }) {
  const { NAVY, NAVY_BG } = useCategoryTheme()
  return (
    <div className="px-4">
      <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: NAVY_BG }}>
        <p className="text-[11px] font-bold mb-1" style={{ color: NAVY }}>현재 플랜</p>
        <p className="text-[28px] font-black" style={{ color: NAVY }}>무료</p>
        <p className="text-[12px] mt-1" style={{ color: `${NAVY}80` }}>기본 매물 등록 1건 · 분석 월 3회</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <p className="text-[14px] font-bold text-gray-900 mb-3">프리미엄 혜택</p>
        {['노출 우선순위 상위권 고정', '설명문 무제한 생성', '진지도 우선 매칭', '매물 3건 동시 등록', '권리금 분석 리포트 월 30회'].map((b, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
            <span className="text-[14px]">✓</span>
            <p className="text-[13px] text-gray-700">{b}</p>
          </div>
        ))}
      </div>
      <button onClick={() => showToast('구독 기능은 준비 중이에요 🚧')}
        className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white"
        style={{ backgroundColor: NAVY }}>
        프리미엄 시작 — 월 9,900원
      </button>
    </div>
  )
}

function PaymentMethodContent({ showToast }) {
  const { NAVY } = useCategoryTheme()
  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-5 mb-4 flex flex-col items-center gap-2">
        <span className="text-[32px]">💳</span>
        <p className="text-[14px] text-gray-500">등록된 결제 수단이 없어요</p>
        <button onClick={() => showToast('결제 수단 추가 준비 중이에요 🚧')} className="mt-2 px-5 py-2 rounded-full text-[13px] font-bold text-white"
          style={{ backgroundColor: NAVY }}>+ 결제 수단 추가</button>
      </div>
      <p className="text-[11px] text-gray-400 text-center">국내 카드, 카카오페이, 네이버페이를 지원합니다</p>
    </div>
  )
}

function PaymentHistoryContent() {
  const items = [
    { date: '2026.06.01', name: '모두 무료 플랜', amount: '0원', status: '무료' },
  ]
  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-4 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-[14px] font-semibold text-gray-800">{it.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{it.date}</p>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-bold text-gray-800">{it.amount}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>{it.status}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 text-center mt-4">결제 내역이 여기에 표시됩니다</p>
    </div>
  )
}

function TextContent({ lines }) {
  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        {lines.map((l, i) => (
          <p key={i} className="text-[13px] text-gray-700 leading-relaxed mb-3 last:mb-0">{l}</p>
        ))}
      </div>
    </div>
  )
}

function FAQContent({ showToast }) {
  const faqs = [
    { q: '권리금은 어떻게 산정되나요?', a: '모두가 POS 매출, 상권 데이터, 인테리어 상태를 종합 분석합니다.' },
    { q: '매물 등록 후 수정이 가능한가요?', a: 'E1 매물 등록 화면에서 언제든지 수정 가능합니다.' },
    { q: 'DM은 익명인가요?', a: '연락처 교환 전까지 번호는 비공개입니다. 앱 내 DM으로만 소통합니다.' },
    { q: '계약이 성사되면 수수료가 있나요?', a: '기본 매칭은 무료입니다. 프리미엄 서비스는 별도 안내됩니다.' },
  ]
  const [open, setOpen] = useState(null)
  return (
    <div className="px-4">
      {faqs.map((f, i) => (
        <button key={i} onClick={() => setOpen(open === i ? null : i)}
          className="w-full bg-white rounded-2xl border border-gray-100 p-4 mb-3 text-left">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-gray-800 flex-1 pr-2">Q. {f.q}</p>
            <span className="text-gray-400 text-lg">{open === i ? '∧' : '∨'}</span>
          </div>
          {open === i && (
            <p className="text-[12px] text-gray-600 mt-3 pt-3 border-t border-gray-50 leading-relaxed">
              A. {f.a}
            </p>
          )}
        </button>
      ))}
    </div>
  )
}

function NoticeContent() {
  const { NAVY } = useCategoryTheme()
  const notices = [
    { title: '개인정보처리방침 개정 안내', date: '2026.06.15', isNew: true },
    { title: '모두 앱 v0.1.0 업데이트 안내', date: '2026.06.01', isNew: false },
    { title: '권리금 분석 기능 베타 오픈', date: '2026.05.20', isNew: false },
  ]
  return (
    <div className="px-4">
      {notices.map((n, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 mb-3 flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {n.isNew && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: NAVY }}>NEW</span>}
              <p className="text-[13px] font-semibold text-gray-800 leading-snug">{n.title}</p>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{n.date}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function LabContent({ showToast }) {
  const { NAVY, NAVY_BG } = useCategoryTheme()
  const features = [
    { name: '권리금 협상 도우미', desc: '채팅 중 모두가 협상 멘트를 실시간 제안', on: false },
    { name: '매물 공개 일정 예약', desc: '특정 날짜·시간에 자동 공개', on: true },
    { name: '비교 매물 레이더 차트', desc: '유사 매물 5개와 내 매물 비교', on: false },
  ]
  const [states, setStates] = useState(features.map(f => f.on))
  return (
    <div className="px-4">
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: NAVY_BG }}>
        <p className="text-[12px] font-bold mb-1" style={{ color: NAVY }}>🧪 실험실이란?</p>
        <p className="text-[12px] leading-relaxed" style={{ color: `${NAVY}99` }}>아직 정식 출시 전인 베타 기능을 먼저 써볼 수 있어요. 언제든 OFF 가능합니다.</p>
      </div>
      {features.map((f, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 mb-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[13px] font-bold text-gray-800">{f.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{f.desc}</p>
          </div>
          <button onClick={() => {
            const next = [...states]; next[i] = !next[i]; setStates(next)
          }} className="w-12 h-6 rounded-full transition-all duration-300 relative shrink-0"
            style={{ backgroundColor: states[i] ? NAVY : '#d1d5db' }}>
            <div className="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300 shadow-sm"
              style={{ left: states[i] ? '26px' : '2px' }} />
          </button>
        </div>
      ))}
    </div>
  )
}

// 실데이터 소스가 없는 섹션 — 카드 프레임만 유지하고 준비중 안내
function ComingSoonCard({ desc }) {
  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl border border-gray-100">
        <ComingSoon desc={desc} />
      </div>
    </div>
  )
}

// 이름(닉네임) 실저장 폼 — localStorage 프로필(name)에 저장, 새 문의부터 표시
function NameForm({ showToast }) {
  const { NAVY } = useCategoryTheme()
  const [name, setName] = useState(getProfile().name ?? '')

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) { showToast('이름을 입력해주세요'); return }
    saveProfile({ name: trimmed })
    showToast('이름이 저장됐어요 ✓')
  }

  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 mb-3">
        <p className="text-[11px] text-gray-400 mb-1">이름 (닉네임)</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="문의 상대에게 보여질 이름"
          className="w-full text-[14px] font-semibold text-gray-800 outline-none bg-transparent"
        />
      </div>
      <p className="text-[11px] text-gray-400 px-1 mb-4">
        저장하면 새로 시작하는 문의·대화에 이 이름이 표시돼요 (기존 대화는 유지)
      </p>
      <button onClick={save} className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-white"
        style={{ backgroundColor: NAVY }}>
        저장
      </button>
    </div>
  )
}

// ── 섹션 콘텐츠 렌더러 ──────────────────────────────────────
function SectionContent({ section, showToast }) {
  switch (section) {
    case 'membership':    return <MembershipContent showToast={showToast} />
    case 'payment-method': return <PaymentMethodContent showToast={showToast} />
    case 'payment-history': return <PaymentHistoryContent />
    case 'terms':         return <TextContent lines={['본 이용약관은 모두(이하 "회사")가 제공하는 서비스 이용 조건 및 절차 등에 관한 사항을 규정합니다.', '제1조(목적) 이 약관은 회사가 운영하는 모두 앱·웹 서비스 이용에 관한 조건과 절차, 회사와 이용자의 권리·의무·책임 사항을 규정함을 목적으로 합니다.', '제2조(정의) "이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다. "매물"이란 이용자가 등록한 영업양도·임대 대상 점포를 말합니다.', '[이하 전문 준비 중]']} />
    case 'privacy':       return <TextContent lines={['모두는 이용자의 개인정보를 소중하게 다룹니다. 본 처리방침은 수집 항목, 이용 목적, 보유 기간을 안내합니다.', '수집 항목: 이름, 휴대폰 번호, 이메일, 사업자등록번호 (선택)', '이용 목적: 서비스 제공, 매칭, 고객 지원', '보유 기간: 회원 탈퇴 후 30일 내 삭제 (법령에 따라 일부 보존)', '[이하 전문 준비 중]']} />
    case 'business-cert': return <ComingSoonCard desc="사업자 인증을 연동하면 등록 정보가 표시돼요" />
    case 'identity':      return <ComingSoonCard desc="본인인증을 연동하면 인증 내역이 표시돼요" />
    case 'pin':           return <ComingSoonCard desc="PIN·비밀번호 관리 기능을 준비하고 있어요" />
    case 'devices':       return <ComingSoonCard desc="로그인 기기 관리 기능을 준비하고 있어요" />
    case 'name':          return <NameForm showToast={showToast} />
    case 'contact':       return <ComingSoonCard desc="연락처 등록 기능을 준비하고 있어요" />
    case 'business-info': return <ComingSoonCard desc="사업자 정보 등록 기능을 준비하고 있어요" />
    case 'social':        return <ComingSoonCard desc="소셜 계정 연동 기능을 준비하고 있어요" />
    case 'faq':           return <FAQContent showToast={showToast} />
    case 'notice':        return <NoticeContent />
    case 'lab':           return <LabContent showToast={showToast} />
    default:              return <TextContent lines={['준비 중인 기능입니다.']} />
  }
}

// ── 메인 ──────────────────────────────────────────────────
export default function MyDetailPage() {
  const navigate = useNavigate()
  const { section } = useParams()
  const { toast, showToast } = useToast()

  const meta = SECTION_META[section] || { title: section, emoji: '⚙️' }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 px-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f3f4f6' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-gray-900">{meta.emoji} {meta.title}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto py-4" style={{ scrollbarWidth: 'none' }}>
        <SectionContent section={section} showToast={showToast} />
        <div className="h-8" />
      </main>

      <Toast message={toast} />
    </div>
  )
}
