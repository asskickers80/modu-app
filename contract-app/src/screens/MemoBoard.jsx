import { useEffect, useRef, useState } from 'react'
import { saveBoard, loadBoard } from '../lib/boardStore.js'

// 2번 탭 '상담 메모' — 1번 탭에서 [캡처]한 화면을 고정 배경으로 깔고
// 포스트잇 스타일 메모를 붙인다. 추가·드래그 이동·수정·삭제, IndexedDB 자동 저장.
const COLORS = ['#fef3c7', '#fce7f3', '#dcfce7', '#dbeafe'] // 노랑/분홍/초록/파랑

let nextNoteId = 1

export default function MemoBoard({ board, onBoardChange }) {
  const containerRef = useRef(null)
  const dragRef = useRef(null) // { id, dx, dy } (포인터-메모 좌상단 오프셋, 비율)
  const [editingId, setEditingId] = useState(null)

  const notes = board?.notes || []

  // 변경 시 자동 저장 (디바운스)
  useEffect(() => {
    if (!board) return
    const t = setTimeout(() => saveBoard(board).catch(() => {}), 400)
    return () => clearTimeout(t)
  }, [board])

  function setNotes(updater) {
    onBoardChange(b => ({ ...b, notes: typeof updater === 'function' ? updater(b.notes || []) : updater }))
  }

  function addNote() {
    const id = `n${Date.now()}-${nextNoteId++}`
    setNotes(ns => [...ns, { id, x: 0.1 + (ns.length % 5) * 0.05, y: 0.08 + (ns.length % 5) * 0.05, color: COLORS[ns.length % COLORS.length], text: '' }])
    setEditingId(id)
  }

  function pointerPos(e) {
    const rect = containerRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  function startDrag(e, note) {
    if (editingId === note.id) return // 편집 중엔 드래그 안 함
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p = pointerPos(e)
    dragRef.current = { id: note.id, dx: p.x - note.x, dy: p.y - note.y }
  }

  function onDrag(e) {
    const d = dragRef.current
    if (!d) return
    const p = pointerPos(e)
    setNotes(ns => ns.map(n => (n.id === d.id
      ? { ...n, x: Math.min(0.92, Math.max(0, p.x - d.dx)), y: Math.min(0.95, Math.max(0, p.y - d.dy)) }
      : n)))
  }

  function endDrag() {
    dragRef.current = null
  }

  if (!board?.image) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-gray-300">
        <span className="text-3xl">📋</span>
        <p className="text-sm font-semibold">아직 캡처된 화면이 없어요</p>
        <p className="text-xs leading-relaxed">1번 천하통일 탭에서 입력을 마친 뒤<br />툴바의 <b>캡처</b> 버튼을 누르면 여기에 나타납니다.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-1.5">
        <button onClick={addNote}
          className="h-10 rounded-xl bg-amber-400 px-4 text-sm font-bold text-amber-950 shadow-sm active:bg-amber-500">
          + 메모 붙이기
        </button>
        <span className="min-w-0 flex-1 truncate text-right text-[11px] text-gray-300">
          {board.capturedAt ? `캡처: ${new Date(board.capturedAt).toLocaleString('ko-KR')}` : ''} · 메모를 끌어서 옮기고, 눌러서 수정
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-slate-200 p-3">
        <div
          ref={containerRef}
          className="relative mx-auto max-w-4xl select-none overflow-hidden rounded-lg shadow"
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* 고정 배경: 캡처된 화면 */}
          <img src={board.image} alt="캡처된 화면" className="block w-full" draggable={false} />

          {/* 포스트잇 메모들 */}
          {notes.map(note => (
            <div
              key={note.id}
              className="absolute w-[22%] min-w-32 rounded-sm shadow-lg"
              style={{ left: `${note.x * 100}%`, top: `${note.y * 100}%`, backgroundColor: note.color, transform: 'rotate(-0.6deg)' }}
              onPointerDown={e => startDrag(e, note)}
            >
              <div className="flex items-center justify-between px-2 pt-1.5">
                <span className="text-[10px] text-black/30">≡ 끌어서 이동</span>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => setNotes(ns => ns.filter(n => n.id !== note.id))}
                  aria-label="메모 삭제"
                  className="px-1 text-xs text-black/30 active:text-black/70"
                >
                  ✕
                </button>
              </div>
              {editingId === note.id ? (
                <textarea
                  autoFocus
                  defaultValue={note.text}
                  onPointerDown={e => e.stopPropagation()}
                  onBlur={e => {
                    setNotes(ns => ns.map(n => (n.id === note.id ? { ...n, text: e.target.value } : n)))
                    setEditingId(null)
                  }}
                  className="block h-24 w-full resize-none bg-transparent px-2 pb-2 text-sm leading-snug text-gray-900 focus:outline-none"
                  placeholder="메모 입력…"
                />
              ) : (
                <p
                  onClick={() => setEditingId(note.id)}
                  className="min-h-10 whitespace-pre-wrap break-words px-2 pb-2 text-sm leading-snug text-gray-900"
                >
                  {note.text || <span className="text-black/30">눌러서 입력</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
