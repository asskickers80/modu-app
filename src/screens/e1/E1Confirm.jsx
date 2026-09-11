/**
 * 자동 채움 확인 화면 (ORDER 2026-09-11 파트 B3) — /e1/confirm
 * 칩: 업종 / 주소·호실 / 층 / 전용면적 / 건물 연식. 전부 확정하거나 건너뛰면 기존 등록 폼(/e1/1)이 채워진 채 열린다.
 * 돈 5칸·매출·사유는 여기에 없다(직접 입력만). 저장은 사용자가 확정한 값만, 출처는 fieldSources 로 넘긴다.
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AutofillConfirm from '../../components/AutofillConfirm'
import { logEvent } from '../../lib/eventLog'
import { MONEY_FIELDS } from '../../lib/placeLookup'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const LABEL = { categoryMain: '업종', address: '주소·호실', floor: '층', area: '전용면적', buildingYear: '건물 연식' }
const DRAFT_KEY = 'modu_e1_draft'

export default function E1Confirm() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const draft = state?.draft ?? { fields: {}, sources: {}, flags: {} }
  const [decisions, setDecisions] = useState({})
  const [values, setValues] = useState({ ...draft.fields })

  const items = Object.keys(LABEL).filter(k => values[k] != null && values[k] !== '').map(k => ({
    key: k, label: LABEL[k],
    value: k === 'categoryMain' ? [values.categoryMain, values.categorySub].filter(Boolean).join(' > ') : k === 'buildingYear' ? `${values[k]}년 준공` : k === 'floor' ? `${values[k]}층` : k === 'area' ? `${values[k]}㎡` : values[k],
  }))

  const decide = (field, action, value) => {
    setDecisions(prev => ({ ...prev, [field]: action }))
    if (action === 'edit' && value != null) setValues(prev => ({ ...prev, [field]: value }))
    logEvent('reg_confirm', { field, action })
  }

  const proceed = (skipped = false) => {
    const fieldSources = {}
    for (const k of Object.keys(LABEL)) {
      if (values[k] == null || values[k] === '') continue
      const d = decisions[k]
      fieldSources[k] = { source: draft.sources[k] ?? 'naver_local', status: d === 'confirm' ? 'user_confirmed' : d === 'edit' ? 'user_edited' : 'auto' }
      if (!d) logEvent('reg_confirm', { field: k, action: 'skip' })
    }
    const e1 = {
      address: values.address ?? '', jibunAddress: values.jibunAddress ?? '', bcode: values.bcode ?? '',
      shopName: values.shopName ?? '', floor: values.floor ?? '', area: values.area ?? '',
      categoryMain: values.categoryMain ?? null, categorySub: values.categorySub ?? null, ksicCode: values.ksicCode ?? null, bizType: values.bizType ?? '',
      buildingRegistry: values.buildingRegistry ?? null, autoFilled: !!(values.floor || values.area),
      fieldSources, regStartMode: state?.mode ?? 'name', regStartAt: state?.startedAt ?? Date.now(),
    }
    for (const k of MONEY_FIELDS) delete e1[k] // 돈·매출·사유는 절대 없음
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(e1)) } catch (_) {}
    navigate('/e1/1', { replace: true, state: { skipped } })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <div className="shrink-0 flex items-center px-5 pt-12 pb-2 gap-2">
        <button onClick={() => navigate(-1)} aria-label="뒤로" className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-400">‹</button>
        <h1 className="flex-1 text-center text-t16 font-bold text-gray-900">맞는지 확인해 주세요</h1>
        <span className="w-9" />
      </div>
      <main className="flex-1 overflow-y-auto px-5 pb-32">
        {values.shopName && <p className="text-t18 font-black text-gray-900 mt-3 mb-1">{values.shopName}</p>}
        {items.length ? (
          <AutofillConfirm items={items} flags={draft.flags} accent={NAVY} accentBg={NAVY_BG} onDecide={decide} decisions={decisions} />
        ) : (
          <p className="text-t13 text-gray-500 mt-3">미리 채울 수 있는 정보가 없었어요 · 직접 입력으로 이어갈게요</p>
        )}
        <p className="text-t12 text-gray-400 mt-4">권리금·보증금·월세·관리비·월매출은 다음 화면에서 직접 넣어요</p>
      </main>
      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50 flex gap-2">
        <button type="button" onClick={() => proceed(true)} data-testid="confirm-skip" className="px-4 py-[18px] rounded-2xl text-t14 font-semibold text-gray-500 bg-gray-100">건너뛰기</button>
        <button type="button" onClick={() => proceed(false)} data-testid="confirm-next"
          className="flex-1 py-[18px] rounded-2xl text-t16 font-bold text-white" style={{ backgroundColor: '#111827' }}>
          다음 — 금액 입력
        </button>
      </div>
    </div>
  )
}
