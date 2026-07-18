/**
 * 브랜드 워드마크 텍스트 '모두' — 기능 카피에서 주어로 등장할 때 강조 표기.
 *
 * 규칙 (2026-07-19 오더):
 * - Pretendard Bold + 브랜드 프라이머리 토큰(--color-brand-blue). 크기는 본문 상속(굵기+색만 차등).
 * - 일반 명사 '모두'(everyone) 문장에는 쓰지 않는다 — 사용처는 카피 기준으로 수동 지정.
 * - tone="light": 프라이머리가 배경과 겹치는 어두운 표면 전용 (흰색 볼드, 새 색상 아님).
 */
export default function ModuWord({ tone = 'brand' }) {
  return (
    <span
      className="font-bold"
      style={{
        fontFamily: 'Pretendard, sans-serif',
        color: tone === 'light' ? '#ffffff' : 'var(--color-brand-blue)',
      }}>
      모두
    </span>
  )
}
