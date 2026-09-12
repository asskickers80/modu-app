/**
 * 등록 마지막 화면 두 갈래 (ORDER 2026-09-12 파트 B2) — [바로 공개] / [조용히 반응 보기]
 * 조용히 카드 아래 좋은 점·대신 두 열은 항상 펼쳐진 채(접힘·숨김 없음, PRICING §1-4). 동시 quiet 상한이면 카드 비활성 + 1줄.
 */
import { prosLines, consLines } from '../lib/quietRules'
import { QUIET, QUIET_COPY } from '../../config/quiet'

export default function PublishModeChoice({ mode, onChange, axis = 'seller', quietCount = 0, accent = '#1a4d8f', accentBg = '#eef2fb' }) {
  const full = quietCount >= QUIET.MAX_QUIET_PER_USER
  const Card = ({ value, title, sub, disabled, testId }) => (
    <button type="button" disabled={disabled} onClick={() => onChange(value)} data-testid={testId} aria-pressed={mode === value}
      className="flex-1 text-left rounded-2xl border-2 px-4 py-3.5 disabled:opacity-40"
      style={{ borderColor: mode === value ? accent : '#e5e7eb', backgroundColor: mode === value ? accentBg : 'white' }}>
      <p className="text-t15 font-bold text-gray-900">{title}</p>
      <p className="text-t12 text-gray-500 mt-0.5">{sub}</p>
    </button>
  )
  return (
    <div className="mt-6" data-testid="publish-mode">
      <p className="text-t14 font-bold text-gray-900 mb-2">어떻게 올릴까요?</p>
      <div className="flex gap-2">
        <Card value="public" title={QUIET_COPY.publicCard} sub="상호·사진·위치까지 바로 보여요" testId="publish-public" />
        <Card value="quiet" title={QUIET_COPY.quietCard} sub="조건만 먼저 보여주고 반응을 봐요" disabled={full} testId="publish-quiet" />
      </div>
      {full && <p className="text-t12 mt-1.5" style={{ color: '#A65A0C' }} data-testid="publish-quiet-max">{QUIET_COPY.maxNotice.replace('{n}', String(QUIET.MAX_QUIET_PER_USER))}</p>}
      {/* 두 열은 항상 펼쳐서 나란히 — 접기·숨김 없음 */}
      <div className="grid grid-cols-2 gap-2 mt-3" data-testid="publish-quiet-terms">
        <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: accentBg }} data-testid="publish-pros">
          <p className="text-t12 font-bold mb-1" style={{ color: accent }}>{QUIET_COPY.prosTitle}</p>
          {prosLines(axis).map(l => <p key={l} className="text-t12 text-gray-700 leading-snug mt-1">· {l}</p>)}
        </div>
        <div className="rounded-2xl px-3 py-3 bg-gray-50" data-testid="publish-cons">
          <p className="text-t12 font-bold mb-1 text-gray-600">{QUIET_COPY.consTitle}</p>
          {consLines().map(l => <p key={l} className="text-t12 text-gray-700 leading-snug mt-1">· {l}</p>)}
        </div>
      </div>
    </div>
  )
}
