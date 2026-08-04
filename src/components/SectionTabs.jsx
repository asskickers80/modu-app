import { useEffect, useRef, useState } from 'react'

/**
 * 광고 섹션 앵커 탭 — E2·E2L 공용 (ORDER-ad-frame-v1, 복제 금지).
 * EditStepTabs 문법 준용: 가로 스크롤 칩, 현재 위치 강조.
 * - 탭하면 해당 섹션으로 점프(스크롤 컨테이너 기준), 스크롤하면 현재 섹션이 자동 하이라이트.
 * - sections: [{ id, label }] — 내용이 있는 섹션만 호출부가 넘긴다(빈 섹션 헤더 금지).
 * - scrollRef: 실제 스크롤되는 <main> 등의 ref. 없으면 window 기준.
 */
export default function SectionTabs({ sections, scrollRef, accent = '#1a4d8f', accentBg = '#eef2fb' }) {
  const [active, setActive] = useState(sections[0]?.id ?? null)
  const barRef = useRef(null)

  useEffect(() => {
    const root = scrollRef?.current ?? null
    const onScroll = () => {
      const top = (root?.getBoundingClientRect().top ?? 0) + 80 // 탭 바 아래 기준선
      let cur = sections[0]?.id ?? null
      for (const s of sections) {
        const el = document.getElementById(`sec-${s.id}`)
        if (el && el.getBoundingClientRect().top <= top) cur = s.id
      }
      setActive(cur)
    }
    const target = root ?? window
    target.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => target.removeEventListener('scroll', onScroll)
  }, [sections, scrollRef])

  // 활성 칩이 가로 스크롤 밖으로 나가지 않게
  useEffect(() => {
    const chip = barRef.current?.querySelector(`[data-chip="${active}"]`)
    chip?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [active])

  if (sections.length < 2) return null // 섹션이 하나뿐이면 탭이 의미 없다

  const jump = id => {
    const el = document.getElementById(`sec-${id}`)
    if (!el) return
    const root = scrollRef?.current
    if (root) {
      const delta = el.getBoundingClientRect().top - root.getBoundingClientRect().top
      root.scrollTo({ top: root.scrollTop + delta - 8, behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setActive(id)
  }

  return (
    <div ref={barRef} data-testid="ad-section-tabs"
      className="flex gap-1.5 overflow-x-auto px-5 py-2.5 bg-white border-b border-gray-50"
      style={{ scrollbarWidth: 'none' }}>
      {sections.map(s => {
        const on = active === s.id
        return (
          <button key={s.id} type="button" data-chip={s.id}
            data-testid={`section-tab-${s.id}`}
            onClick={() => jump(s.id)}
            className="shrink-0 px-3 py-1.5 rounded-full text-t12 font-semibold border transition-all active:scale-[0.97]"
            style={on
              ? { borderColor: accent, backgroundColor: accentBg, color: accent }
              : { borderColor: '#e5e7eb', backgroundColor: 'white', color: '#9ca3af' }}>
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

/** 섹션 헤더 + 앵커 — 내용이 있을 때만 호출부가 렌더한다(빈 섹션 금지) */
export function AdSection({ id, icon, title, children }) {
  return (
    <section id={`sec-${id}`} data-testid={`ad-section-${id}`} className="mb-5 scroll-mt-2">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-t16">{icon}</span>
        <h2 className="text-t15 font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}
