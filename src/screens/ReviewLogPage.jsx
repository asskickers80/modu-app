import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReviewLogs, clearReviewLogs } from '../lib/reviewLog'

const CHOICE_LABEL = { keep: '그대로', edit: '수정', hide: '공개안함' }
const CHOICE_COLOR = { keep: '#22c55e', edit: '#2b8ac9', hide: '#9ca3af' }
const TRANSFER_LABEL = { bare: '바닥권리', full: '영업양도', undecided: '미정' }

function ChoiceBadge({ choice }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: CHOICE_COLOR[choice] ?? '#9ca3af' }}>
      {CHOICE_LABEL[choice] ?? choice}
    </span>
  )
}

function LogEntry({ entry }) {
  const [open, setOpen] = useState(false)
  const { listing, items, summary, createdAt } = entry

  const date = new Date(createdAt)
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      {/* 헤더 (항상 표시) */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 bg-white active:bg-gray-50 transition-all">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-gray-900 truncate">
            {listing.shopName || '(상호 미입력)'}
          </p>
          <p className="text-[12px] text-gray-400 mt-0.5 truncate">
            {listing.address || '주소 없음'} · {TRANSFER_LABEL[listing.transferType] ?? '-'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-gray-400">{dateStr}</span>
            <span className="text-gray-200">|</span>
            <span className="text-[11px] font-semibold text-green-600">그대로 {summary.kept}</span>
            <span className="text-[11px] font-semibold text-blue-500">수정 {summary.edited}</span>
            <span className="text-[11px] font-semibold text-gray-400">비공개 {summary.hidden}</span>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          className="shrink-0 mt-0.5 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M4 6l4 4 4-4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 상세 (펼쳤을 때) */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 flex flex-col gap-3">
          {items.map(item => (
            <div key={item.blockId} className="bg-white rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-bold text-gray-700 flex-1">{item.blockTitle}</p>
                <ChoiceBadge choice={item.userChoice} />
              </div>

              {/* AI 원본 */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1">모두 원본</p>
                <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-line line-clamp-3">
                  {item.aiOriginal}
                </p>
              </div>

              {/* 수정한 경우 비교 표시 */}
              {item.userChoice === 'edit' && item.userText && (
                <div className="border-t border-dashed border-blue-200 pt-2">
                  <p className="text-[10px] font-bold text-blue-400 mb-1">사람이 수정한 텍스트</p>
                  <p className="text-[12px] text-blue-700 leading-relaxed whitespace-pre-line">
                    {item.userText}
                  </p>
                </div>
              )}

              {item.userChoice === 'hide' && (
                <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-2">
                  🙈 공개 안 함 선택 — 양수자에게 노출 안 됨
                </p>
              )}
            </div>
          ))}

          {/* 매물 원본 데이터 */}
          <details className="bg-white rounded-xl p-3">
            <summary className="text-[11px] font-bold text-gray-400 cursor-pointer select-none">
              매물 입력 데이터 (원본) 보기
            </summary>
            <pre className="mt-2 text-[10px] text-gray-500 leading-relaxed overflow-auto">
              {JSON.stringify(listing, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

export default function ReviewLogPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState(getReviewLogs)
  const [confirmClear, setConfirmClear] = useState(false)

  const handleClear = () => {
    clearReviewLogs()
    setLogs([])
    setConfirmClear(false)
  }

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#0f172a' }}>

      {/* 헤더 */}
      <div className="px-5 pt-12 pb-5">
        <button onClick={() => navigate('/dev')}
          className="flex items-center gap-1.5 mb-4 text-slate-400">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 13l-5-5 5-5" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[13px]">Dev 메뉴로</span>
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
          style={{ backgroundColor: '#1e293b' }}>
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[11px] font-bold text-green-400 tracking-wide">모두 학습 재료</span>
        </div>
        <h1 className="text-[22px] font-black text-white mb-1">검수 로그</h1>
        <p className="text-[13px] text-slate-400">
          모두가 쓴 초안을 사람이 어떻게 고쳤는지 기록이에요. 쌓일수록 모두가 똑똑해져요.
        </p>
      </div>

      {/* 통계 칩 */}
      {logs.length > 0 && (
        <div className="px-5 mb-4 flex gap-2 flex-wrap">
          {[
            { label: '총 검수 세션', value: logs.length, color: '#e2e8f0' },
            { label: '수정 항목', value: logs.reduce((s, l) => s + l.summary.edited, 0), color: '#93c5fd' },
            { label: '비공개 항목', value: logs.reduce((s, l) => s + l.summary.hidden, 0), color: '#fca5a5' },
          ].map(stat => (
            <div key={stat.label} className="px-3 py-2 rounded-xl" style={{ backgroundColor: '#1e293b' }}>
              <p className="text-[10px] text-slate-400">{stat.label}</p>
              <p className="text-[18px] font-black" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 로그 목록 */}
      <div className="px-4 flex flex-col gap-3">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="text-[48px]">📭</div>
            <p className="text-[16px] font-bold text-slate-300">아직 검수 기록이 없어요</p>
            <p className="text-[13px] text-slate-500 leading-relaxed">
              E1 1단계 → 2단계(초안 생성) → 3단계(검수) 를<br />완료하면 여기에 기록이 쌓여요
            </p>
            <button onClick={() => navigate('/e1/1')}
              className="mt-2 px-5 py-3 rounded-2xl text-[14px] font-bold text-white"
              style={{ backgroundColor: '#1a4d8f' }}>
              지금 매물 등록 해보기
            </button>
          </div>
        ) : (
          [...logs].reverse().map(entry => (
            <LogEntry key={entry.id} entry={entry} />
          ))
        )}
      </div>

      {/* 전체 삭제 */}
      {logs.length > 0 && (
        <div className="px-5 mt-6">
          {!confirmClear ? (
            <button onClick={() => setConfirmClear(true)}
              className="w-full py-3 rounded-2xl text-[13px] font-semibold text-red-400 border border-red-900">
              전체 로그 삭제 (테스트용)
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmClear(false)}
                className="flex-1 py-3 rounded-2xl text-[13px] font-semibold text-slate-400 border border-slate-700">
                취소
              </button>
              <button onClick={handleClear}
                className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-white bg-red-600">
                확인 — 전체 삭제
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
