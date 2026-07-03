/**
 * 실데이터 연동 전 자리 표시 — 가짜 숫자 대신 "서비스 준비중"을 보여준다.
 * 카드/섹션 프레임은 호출부가 유지하고, 이 컴포넌트는 내부 안내만 담당.
 *
 * - 기본: 카드 본문용 중앙 정렬 블록 (title·desc 선택)
 * - compact: 수치 한 칸짜리 자리(통계 카드 등)용 인라인 변형
 */
export default function ComingSoon({ title, desc, compact = false }) {
  if (compact) {
    return <span className="text-[15px] font-bold text-gray-300 leading-none">준비중</span>
  }
  return (
    <div className="py-5 text-center">
      {title && <p className="text-[12px] font-semibold text-gray-500 mb-1">{title}</p>}
      <p className="text-[13px] font-bold text-gray-400">서비스 준비중</p>
      {desc && <p className="text-[11px] text-gray-400 mt-1">{desc}</p>}
    </div>
  )
}
