import { useNavigate } from 'react-router-dom'
import ModuMark from '../components/ModuMark'

const COLORS = [
  { name: 'Primary Blue',   token: 'brand-blue',    hex: '#1683B8', dark: false },
  { name: 'Ink',            token: 'brand-ink',     hex: '#123A5E', dark: false },
  { name: 'Mint',           token: 'brand-mint',    hex: '#A9DDF2', dark: false },
  { name: 'Tint Surface',   token: 'brand-tint',    hex: '#E6EFFA', dark: false },
  { name: 'Paper',          token: 'brand-paper',   hex: '#F4F8FE', dark: false },
  { name: 'Border',         token: 'brand-border',  hex: '#DAE8F4', dark: false },
  { name: 'Muted Text',     token: 'brand-muted',   hex: '#5A7896', dark: false },
  { name: 'Label',          token: 'brand-label',   hex: '#3E83B0', dark: false },
  { name: 'Tagline on dark',token: 'brand-tagline', hex: '#BCE4F4', dark: false },
]

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3">{title}</p>
      {children}
    </div>
  )
}

export default function BrandPreviewPage() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-brand-paper">
      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-brand-border px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <p className="text-[15px] font-black text-brand-ink">Brand Preview</p>
          <p className="text-[11px] text-brand-muted">모두(modu) 브랜드 자산 확인</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-5" style={{ scrollbarWidth: 'none' }}>

        {/* ── 심볼 기본형 ── */}
        <Section title="Symbol — 기본형 (light bg)">
          <div className="flex items-end gap-6 bg-white rounded-card p-5 border border-brand-border shadow-brand">
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={16} highlight="none" />
              <p className="text-[10px] text-brand-muted">16px</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={32} />
              <p className="text-[10px] text-brand-muted">32px</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={48} />
              <p className="text-[10px] text-brand-muted">48px</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={64} />
              <p className="text-[10px] text-brand-muted">64px</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={96} />
              <p className="text-[10px] text-brand-muted">96px</p>
            </div>
          </div>
        </Section>

        {/* ── 심볼 반전형 ── */}
        <Section title="Symbol — 반전형 (dark bg)">
          <div className="flex items-end gap-6 rounded-card p-5 shadow-brand-md"
            style={{ backgroundColor: '#1683B8' }}>
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={16} color="#fff" highlight="#1683B8" />
              <p className="text-[10px] text-white/70">16px</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={32} color="#fff" highlight="#1683B8" />
              <p className="text-[10px] text-white/70">32px</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={48} color="#fff" highlight="#1683B8" />
              <p className="text-[10px] text-white/70">48px</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={64} color="#fff" highlight="#1683B8" />
              <p className="text-[10px] text-white/70">64px</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ModuMark size={96} color="#fff" highlight="#1683B8" />
              <p className="text-[10px] text-white/70">96px</p>
            </div>
          </div>
        </Section>

        {/* ── 로고 락업 ── */}
        <Section title="Logotype — 세로 락업">
          <div className="flex gap-4">
            {/* 기본형 */}
            <div className="flex-1 bg-white rounded-card p-5 border border-brand-border shadow-brand flex flex-col items-center gap-3">
              <ModuMark size={56} />
              <div className="text-center">
                <p className="text-[28px] font-extrabold text-brand-ink leading-none"
                  style={{ letterSpacing: '-0.047em', fontFamily: 'Pretendard, sans-serif' }}>모두</p>
                <p className="text-[13px] font-bold text-brand-blue mt-1 leading-tight"
                  style={{ letterSpacing: '-0.012em', lineHeight: '1.22', fontFamily: 'Pretendard, sans-serif' }}>
                  Everyone,<br />Everything!
                </p>
              </div>
            </div>
            {/* 반전형 */}
            <div className="flex-1 rounded-card p-5 shadow-brand-md flex flex-col items-center gap-3"
              style={{ backgroundColor: '#123A5E' }}>
              <ModuMark size={56} color="#fff" highlight="#123A5E" />
              <div className="text-center">
                <p className="text-[28px] font-extrabold text-white leading-none"
                  style={{ letterSpacing: '-0.047em', fontFamily: 'Pretendard, sans-serif' }}>모두</p>
                <p className="text-[13px] font-bold text-brand-tagline mt-1 leading-tight"
                  style={{ letterSpacing: '-0.012em', lineHeight: '1.22', fontFamily: 'Pretendard, sans-serif' }}>
                  Everyone,<br />Everything!
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 컬러 팔레트 ── */}
        <Section title="Color Palette — 9 Design Tokens">
          <div className="grid grid-cols-3 gap-2">
            {COLORS.map(c => (
              <div key={c.token}
                className="rounded-xl overflow-hidden border border-brand-border shadow-brand">
                <div className="h-10" style={{ backgroundColor: c.hex }} />
                <div className="bg-white px-2 py-1.5">
                  <p className="text-[10px] font-bold text-gray-800 truncate">{c.name}</p>
                  <p className="text-[9px] text-brand-muted font-mono">{c.hex}</p>
                  <p className="text-[9px] text-brand-label font-mono">brand-{c.token.replace('brand-', '')}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 타이포그래피 ── */}
        <Section title="Typography — Pretendard">
          <div className="bg-white rounded-card p-5 border border-brand-border shadow-brand flex flex-col gap-4">
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Display 800 — 36px</p>
              <p className="text-[36px] text-brand-ink leading-none"
                style={{ fontWeight: 800, fontFamily: 'Pretendard, sans-serif' }}>모두</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">워드마크 — letter-spacing −0.047em</p>
              <p className="text-[24px] text-brand-ink leading-none"
                style={{ fontWeight: 800, letterSpacing: '-0.047em', fontFamily: 'Pretendard, sans-serif' }}>모두 modu</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Title 700 — 22px</p>
              <p className="text-[22px] text-brand-ink"
                style={{ fontWeight: 700, fontFamily: 'Pretendard, sans-serif' }}>자영업자 모두의 플랫폼</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">Body 400 — 16px / line-height 1.6</p>
              <p className="text-[16px] text-brand-ink leading-relaxed"
                style={{ fontWeight: 400, fontFamily: 'Pretendard, sans-serif' }}>
                점포 양도·임대·창업·운영, 그리고 이들을 돕는<br />기업회원을 AI가 연결합니다.
              </p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">태그라인 700 — letter-spacing −0.012em</p>
              <p className="text-[18px] text-brand-blue"
                style={{ fontWeight: 700, letterSpacing: '-0.012em', fontFamily: 'Pretendard, sans-serif' }}>
                Everyone, Everything!
              </p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">modu SemiBold — letter-spacing 0.12em</p>
              <p className="text-[14px] text-brand-ink"
                style={{ fontWeight: 600, letterSpacing: '0.12em', fontFamily: 'Pretendard, sans-serif' }}>modu</p>
            </div>
          </div>
        </Section>

        {/* ── 반경·그림자 토큰 ── */}
        <Section title="Radius &amp; Shadow Tokens">
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 items-center">
              <div className="w-16 h-10 bg-brand-blue" style={{ borderRadius: '20px' }} />
              <div>
                <p className="text-[12px] font-bold text-brand-ink">rounded-card</p>
                <p className="text-[11px] text-brand-muted">20px — 카드</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <div className="w-16 h-10 bg-brand-blue" style={{ borderRadius: '24px' }} />
              <div>
                <p className="text-[12px] font-bold text-brand-ink">rounded-card-lg</p>
                <p className="text-[11px] text-brand-muted">24px — 큰 카드</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <div className="w-24 h-10 bg-brand-blue" style={{ borderRadius: '100px' }} />
              <div>
                <p className="text-[12px] font-bold text-brand-ink">rounded-pill</p>
                <p className="text-[11px] text-brand-muted">100px — 버튼·칩</p>
              </div>
            </div>
            <div className="flex gap-3 items-start mt-2">
              <div className="w-16 h-12 bg-white rounded-card shadow-brand border border-brand-border" />
              <div className="w-16 h-12 bg-white rounded-card shadow-brand-md border border-brand-border" />
              <div className="w-16 h-12 bg-white rounded-card shadow-brand-lg border border-brand-border" />
              <div>
                <p className="text-[11px] text-brand-muted mt-1">shadow-brand / md / lg</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 버튼 예시 ── */}
        <Section title="Button Examples">
          <div className="flex flex-col gap-3">
            <button className="w-full py-4 rounded-pill text-white text-[15px] font-bold shadow-brand-md"
              style={{ backgroundColor: '#1683B8' }}>
              Primary Button — brand-blue
            </button>
            <button className="w-full py-4 rounded-pill text-white text-[15px] font-bold shadow-ink"
              style={{ backgroundColor: '#123A5E' }}>
              Dark Button — brand-ink
            </button>
            <button className="w-full py-4 rounded-pill text-brand-blue text-[15px] font-bold border-2 border-brand-blue bg-white">
              Outline Button
            </button>
          </div>
        </Section>

        <div className="h-8" />
      </main>
    </div>
  )
}
