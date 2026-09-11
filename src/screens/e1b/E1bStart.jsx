/**
 * 기업회원 입점 자동 채움 첫 화면 (ORDER 2026-09-11 파트 B6) — /e1b/start
 * 상호 + 사업자등록번호 → 국세청 진위·상태 조회(유효면 "사업자 확인" 사실 배지, 무효면 배지 없음·입점은 계속)
 * → 네이버 지역검색으로 주소·카테고리·전화 초안 → 확인 화면 → 기존 입점 흐름(/e1b/1).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AutofillConfirm from '../../components/AutofillConfirm'
import { verifyBizno, normalizeBizno, isValidBiznoFormat } from '../../lib/bizno'
import { lookupPlace } from '../../lib/placeLookup'
import { logEvent } from '../../lib/eventLog'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const LABEL = { address: '주소', category: '분류', telephone: '전화' }
export const BIZ_INVALID_NOTICE = '국세청 조회 결과 확인되지 않았어요 · 다시 확인해 주세요'

export default function E1bStart() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [bizno, setBizno] = useState('')
  const [phase, setPhase] = useState('ask') // ask | checking | confirm
  const [bizResult, setBizResult] = useState(null) // valid | invalid | error
  const [values, setValues] = useState({})
  const [decisions, setDecisions] = useState({})

  const submit = async () => {
    if (!name.trim() || !isValidBiznoFormat(normalizeBizno(bizno))) return
    setPhase('checking')
    const r = await verifyBizno(bizno)
    const result = r === 'verified' ? 'valid' : r === 'mismatch' ? 'invalid' : 'error'
    setBizResult(result)
    logEvent('vendor_biz_check', { result })
    const { candidates } = await lookupPlace(name.trim())
    const c = candidates[0] ?? null
    setValues({ address: c?.roadAddress || c?.address || '', category: c?.category || '', telephone: c?.telephone || '' })
    setPhase('confirm')
  }
  const decide = (field, action, value) => {
    setDecisions(p => ({ ...p, [field]: action }))
    if (action === 'edit' && value != null) setValues(p => ({ ...p, [field]: value }))
    logEvent('reg_confirm', { field, action })
  }
  const proceed = () => {
    const start = { bizName: name.trim(), bizNumber: normalizeBizno(bizno), verified: bizResult === 'valid', region: values.address || '', phone: values.telephone || '', categoryHint: values.category || '' }
    try { sessionStorage.setItem('modu_e1b_start', JSON.stringify(start)) } catch (_) {}
    navigate('/e1b/1')
  }
  const items = Object.keys(LABEL).filter(k => values[k]).map(k => ({ key: k, label: LABEL[k], value: values[k] }))

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <div className="shrink-0 flex items-center px-5 pt-12 pb-2 gap-2">
        <button onClick={() => navigate(-1)} aria-label="뒤로" className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-400">‹</button>
        <h1 className="flex-1 text-center text-t16 font-bold text-gray-900">입점 시작</h1>
        <span className="w-9" />
      </div>
      <main className="flex-1 overflow-y-auto px-5 pb-32">
        {phase !== 'confirm' ? (
          <>
            <p className="text-t20 font-black text-gray-900 mt-6">어떤 업체인가요?</p>
            <p className="text-t13 text-gray-500 mt-1 mb-4">상호와 사업자등록번호만 넣으면 나머지는 공공 정보로 미리 채워요</p>
            <input value={name} onChange={e => setName(e.target.value)} data-testid="vendor-name" placeholder="상호"
              className="w-full border-2 rounded-2xl px-4 py-3.5 text-t15 outline-none mb-2" style={{ borderColor: name ? PURPLE : '#e5e7eb' }} />
            <input value={bizno} onChange={e => setBizno(e.target.value)} data-testid="vendor-bizno" placeholder="사업자등록번호 10자리" inputMode="numeric"
              className="w-full border-2 rounded-2xl px-4 py-3.5 text-t15 outline-none" style={{ borderColor: bizno ? PURPLE : '#e5e7eb' }} />
            <button type="button" onClick={submit} disabled={phase === 'checking' || !name.trim() || !isValidBiznoFormat(normalizeBizno(bizno))} data-testid="vendor-start-submit"
              className="mt-4 w-full py-3.5 rounded-2xl text-t15 font-bold text-white disabled:opacity-40" style={{ backgroundColor: PURPLE }}>
              {phase === 'checking' ? '확인하는 중…' : '확인하고 미리 채우기'}
            </button>
          </>
        ) : (
          <>
            <p className="text-t18 font-black text-gray-900 mt-3">{name}</p>
            {bizResult === 'valid' ? (
              <span className="inline-block mt-1 mb-3 text-t11 font-bold px-2 py-0.5 rounded-full" data-testid="vendor-biz-badge" style={{ backgroundColor: PURPLE_BG, color: PURPLE }}>사업자 확인</span>
            ) : (
              <p className="text-t12 mt-1 mb-3" data-testid="vendor-biz-notice" style={{ color: '#A65A0C' }}>{BIZ_INVALID_NOTICE}</p>
            )}
            {items.length ? (
              <AutofillConfirm items={items} accent={PURPLE} accentBg={PURPLE_BG} onDecide={decide} decisions={decisions} />
            ) : (
              <p className="text-t13 text-gray-500">미리 채울 수 있는 정보가 없었어요 · 다음 화면에서 직접 넣어요</p>
            )}
          </>
        )}
      </main>
      {phase === 'confirm' && (
        <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
          <button type="button" onClick={proceed} data-testid="vendor-confirm-next"
            className="w-full py-[18px] rounded-2xl text-t16 font-bold text-white" style={{ backgroundColor: PURPLE }}>다음</button>
        </div>
      )}
    </div>
  )
}
