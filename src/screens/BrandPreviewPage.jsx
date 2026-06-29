import { useNavigate } from 'react-router-dom'
import ModuMark from '../components/ModuMark'

// ── 현재 색 ──────────────────────────────────────────────
const CURRENT = { hex: '#0E6589', label: '현재', desc: 'Primary Blue — 기준색' }

// ── 후보 4개 (청록·네이비 방향) ──────────────────────────
const CANDIDATES = [
  {
    id: 'A',
    hex: '#1272A4',
    label: '살짝 깊게',
    desc: '지금보다 10% 어둡게. 여전히 파랑이지만 더 차분해져.',
  },
  {
    id: 'B',
    hex: '#0E6589',
    label: '청록 시작',
    desc: '청록 기운이 올라오기 시작. 분명히 다른 느낌, 시원하고 신뢰감.',
  },
  {
    id: 'C',
    hex: '#0B5A75',
    label: '청록+네이비',
    desc: '청록과 네이비가 균형을 이룸. 깊고 고급스럽고 차분한 브랜드 컬러.',
  },
  {
    id: 'D',
    hex: '#094D64',
    label: '딥 틸-네이비',
    desc: '가장 어둡고 강한 방향. 프리미엄·전문성 느낌이 강해짐.',
  },
]

const MINT = '#A9DDF2'

// ── 색 팔레트 토큰 ────────────────────────────────────────
const PALETTE = [
  { name: 'Primary Blue',    hex: '#0E6589' },
  { name: 'Ink',             hex: '#123A5E' },
  { name: 'Mint',            hex: '#A9DDF2' },
  { name: 'Tint Surface',    hex: '#E6EFFA' },
  { name: 'Paper',           hex: '#F4F8FE' },
  { name: 'Border',          hex: '#DAE8F4' },
  { name: 'Muted Text',      hex: '#5A7896' },
  { name: 'Label',           hex: '#3E83B0' },
  { name: 'Tagline on dark', hex: '#BCE4F4' },
]

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3">{title}</p>
      {children}
    </div>
  )
}

// 미니 스플래시 카드 (색 후보 비교용)
function MiniSplash({ color, id, label, desc, isCurrent }) {
  return (
    <div className={`rounded-2xl overflow-hidden border-2 ${isCurrent ? 'border-gray-300' : 'border-transparent'} shadow-brand-md`}>
      {/* 스플래시 미리보기 */}
      <div
        className="flex flex-col items-center justify-center gap-2 pt-5 pb-4 px-3"
        style={{ backgroundColor: color }}
      >
        <ModuMark size={44} color="#ffffff" highlight={color} />
        <div className="flex flex-col items-center">
          <p style={{
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 800,
            fontSize: '22px',
            letterSpacing: '-0.045em',
            color: '#ffffff',
            lineHeight: 1,
          }}>모두</p>
          <p style={{
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 700,
            fontSize: '9px',
            letterSpacing: '-0.012em',
            lineHeight: 1.22,
            color: MINT,
            marginTop: 4,
            textAlign: 'center',
          }}>Everyone,{'\n'}Everything!</p>
        </div>
      </div>

      {/* 라벨 + 설명 + 버튼 샘플 */}
      <div className="bg-white px-3 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          {isCurrent && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">현재</span>
          )}
          {!isCurrent && (
            <span className="text-[10px] font-black" style={{ color }}>{id}</span>
          )}
          <span className="text-[10px] font-bold text-gray-800">{label}</span>
        </div>
        <p className="text-[9px] text-gray-400 leading-relaxed mb-2.5">{desc}</p>

        {/* 컬러 칩 + hex */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="w-4 h-4 rounded-full border border-gray-100" style={{ backgroundColor: color }} />
          <p className="text-[9px] font-mono text-gray-600">{color}</p>
        </div>

        {/* 버튼 샘플 */}
        <div
          className="w-full py-2 rounded-full text-center text-white text-[10px] font-bold"
          style={{ backgroundColor: color }}
        >
          버튼 샘플
        </div>
      </div>
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

        {/* ── 🎨 메인 브랜드 색 후보 비교 ── */}
        <Section title="🎨 메인 브랜드 색 후보 — 하나 골라주세요">
          {/* 안내 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-[11px] font-bold text-yellow-800 mb-0.5">현재 → 청록·네이비 방향으로 단계별 후보</p>
            <p className="text-[10px] text-yellow-700">스플래시 미리보기 + 버튼 샘플로 실제 느낌을 확인하세요. A→D로 갈수록 더 어둡고 청록·네이비.</p>
          </div>

          {/* 현재 색 */}
          <p className="text-[10px] text-gray-400 mb-2">현재 색</p>
          <div className="grid grid-cols-1 mb-4">
            <MiniSplash
              color={CURRENT.hex}
              id=""
              label={CURRENT.label}
              desc={CURRENT.desc}
              isCurrent
            />
          </div>

          {/* 후보 2×2 */}
          <p className="text-[10px] text-gray-400 mb-2">후보 A~D (청록·네이비 방향)</p>
          <div className="grid grid-cols-2 gap-3">
            {CANDIDATES.map(c => (
              <MiniSplash key={c.id} {...c} isCurrent={false} />
            ))}
          </div>

          {/* 나란히 색상 바 */}
          <div className="mt-4 rounded-xl overflow-hidden flex h-8 border border-gray-100">
            {[CURRENT, ...CANDIDATES].map(c => (
              <div key={c.hex} className="flex-1 relative group" style={{ backgroundColor: c.hex }}>
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/80">
                  {c.id || '현재'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex mt-1">
            {[CURRENT, ...CANDIDATES].map(c => (
              <p key={c.hex} className="flex-1 text-center text-[8px] text-gray-400 font-mono">{c.hex}</p>
            ))}
          </div>
        </Section>

        {/* ── 심볼 기본형 ── */}
        <Section title="Symbol — 기본형 (light bg)">
          <div className="flex items-end gap-5 bg-white rounded-card p-5 border border-brand-border shadow-brand">
            {[16, 32, 48, 64, 96].map(sz => (
              <div key={sz} className="flex flex-col items-center gap-1">
                <ModuMark size={sz} highlight={sz <= 16 ? 'none' : '#ffffff'} />
                <p className="text-[9px] text-brand-muted">{sz}px</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 심볼 반전형 ── */}
        <Section title="Symbol — 반전형 (dark bg)">
          <div className="flex items-end gap-5 rounded-card p-5 shadow-brand-md"
            style={{ backgroundColor: '#0E6589' }}>
            {[16, 32, 48, 64, 96].map(sz => (
              <div key={sz} className="flex flex-col items-center gap-1">
                <ModuMark size={sz} color="#fff" highlight="#0E6589" />
                <p className="text-[9px] text-white/60">{sz}px</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 로고 락업 ── */}
        <Section title="Logotype — 세로 락업">
          <div className="flex gap-4">
            <div className="flex-1 bg-white rounded-card p-5 border border-brand-border shadow-brand flex flex-col items-center gap-3">
              <ModuMark size={56} />
              <div className="text-center">
                <p className="text-[28px] text-brand-ink leading-none"
                  style={{ fontWeight: 800, letterSpacing: '-0.047em', fontFamily: 'Pretendard, sans-serif' }}>모두</p>
                <p className="text-[13px] text-brand-blue mt-1 text-center"
                  style={{ fontWeight: 700, letterSpacing: '-0.012em', lineHeight: '1.22', fontFamily: 'Pretendard, sans-serif' }}>
                  Everyone,<br />Everything!
                </p>
              </div>
            </div>
            <div className="flex-1 rounded-card p-5 shadow-brand-md flex flex-col items-center gap-3"
              style={{ backgroundColor: '#123A5E' }}>
              <ModuMark size={56} color="#fff" highlight="#123A5E" />
              <div className="text-center">
                <p className="text-[28px] text-white leading-none"
                  style={{ fontWeight: 800, letterSpacing: '-0.047em', fontFamily: 'Pretendard, sans-serif' }}>모두</p>
                <p className="text-[13px] text-brand-tagline mt-1 text-center"
                  style={{ fontWeight: 700, letterSpacing: '-0.012em', lineHeight: '1.22', fontFamily: 'Pretendard, sans-serif' }}>
                  Everyone,<br />Everything!
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 컬러 팔레트 ── */}
        <Section title="Color Palette — 9 Design Tokens">
          <div className="grid grid-cols-3 gap-2">
            {PALETTE.map(c => (
              <div key={c.hex} className="rounded-xl overflow-hidden border border-brand-border shadow-brand">
                <div className="h-10" style={{ backgroundColor: c.hex }} />
                <div className="bg-white px-2 py-1.5">
                  <p className="text-[10px] font-bold text-gray-800 truncate">{c.name}</p>
                  <p className="text-[9px] text-brand-muted font-mono">{c.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 타이포그래피 ── */}
        <Section title="Typography — Pretendard">
          <div className="bg-white rounded-card p-5 border border-brand-border shadow-brand flex flex-col gap-4">
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">워드마크 800 — letter-spacing −0.047em</p>
              <p className="text-[32px] text-brand-ink leading-none"
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
                점포 양도·임대·창업·운영, 그리고<br />이들을 돕는 기업회원을 AI가 연결합니다.
              </p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted mb-0.5">태그라인 700 — −0.012em</p>
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

        {/* ── 반경·그림자 ── */}
        <Section title="Radius &amp; Shadow Tokens">
          <div className="flex flex-col gap-3">
            {[
              { r: '20px', token: 'rounded-card', label: '20px — 카드' },
              { r: '24px', token: 'rounded-card-lg', label: '24px — 큰 카드' },
              { r: '100px', token: 'rounded-pill', label: '100px — 버튼·칩' },
            ].map(row => (
              <div key={row.r} className="flex gap-3 items-center">
                <div className="w-16 h-10 bg-brand-blue shrink-0" style={{ borderRadius: row.r }} />
                <div>
                  <p className="text-[12px] font-bold text-brand-ink">{row.token}</p>
                  <p className="text-[11px] text-brand-muted">{row.label}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-3 items-start mt-2">
              {['brand', 'brand-md', 'brand-lg'].map(s => (
                <div key={s} className="w-14 h-10 bg-white rounded-card border border-brand-border"
                  style={{ boxShadow: s === 'brand' ? '0 6px 22px rgba(22,131,184,0.06)'
                    : s === 'brand-md' ? '0 8px 30px rgba(22,131,184,0.10)'
                    : '0 12px 40px rgba(22,131,184,0.14)' }} />
              ))}
              <p className="text-[10px] text-brand-muted mt-2">shadow-brand / md / lg</p>
            </div>
          </div>
        </Section>

        {/* ── 버튼 예시 ── */}
        <Section title="Button Examples">
          <div className="flex flex-col gap-3">
            <button className="w-full py-4 text-white text-[15px] font-bold shadow-brand-md"
              style={{ backgroundColor: '#0E6589', borderRadius: '100px' }}>
              Primary — brand-blue
            </button>
            <button className="w-full py-4 text-white text-[15px] font-bold"
              style={{ backgroundColor: '#123A5E', borderRadius: '100px' }}>
              Dark — brand-ink
            </button>
            <button className="w-full py-4 text-[15px] font-bold border-2 bg-white"
              style={{ borderRadius: '100px', color: '#0E6589', borderColor: '#0E6589' }}>
              Outline
            </button>
          </div>
        </Section>

        <div className="h-8" />
      </main>
    </div>
  )
}
