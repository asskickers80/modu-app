import { useLocation, useNavigate } from 'react-router-dom'

/**
 * 수정 모드 단계 자유 이동 탭 — E1(양도인)·E1p(임대인) 공유(복제 금지).
 * 신규 등록은 선형 완주(온보딩 흐름) 유지, 수정은 고칠 단계로 바로 가서 저장하면 끝
 * (양도인 원칙 '생성 vs 편집 분리' — 수정 진입 시 강제 완주 폐지).
 * editId 없으면 렌더하지 않으므로 각 Step 헤더에 무조건 꽂아도 안전.
 */
export default function EditStepTabs({ editId, steps, accent = '#1a4d8f' }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  if (!editId) return null
  return (
    <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto" data-testid="edit-step-tabs" style={{ scrollbarWidth: 'none' }}>
      {steps.map(s => {
        const active = pathname === s.path
        return (
          <button key={s.path}
            onClick={() => !active && navigate(`${s.path}?edit=${editId}`)}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all active:scale-95"
            style={active
              ? { backgroundColor: accent, color: '#fff' }
              : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

/** E1(양도인) 수정 단계 — 라우트가 파일명과 어긋남에 주의(/e1/3=사진, /e1/4=공개) */
export const E1_EDIT_STEPS = [
  { path: '/e1/1', label: '기본 정보' },
  { path: '/e1/2', label: '소개글' },
  { path: '/e1/3', label: '사진·증빙' },
  { path: '/e1/4', label: '저장·공개' },
]

/** E1p(임대인) 수정 단계 */
export const E1P_EDIT_STEPS = [
  { path: '/e1p/1', label: '기본 정보' },
  { path: '/e1p/2', label: '소개글' },
  { path: '/e1p/3', label: '검수' },
  { path: '/e1p/4', label: '도면·사진' },
  { path: '/e1p/5', label: '저장' },
]
