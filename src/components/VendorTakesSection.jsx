/**
 * 프로필 '함께 일한 사장님 한마디' 칸 (ORDER 2026-09-12 파트 C4) — 항상 후기 칸 아래.
 * 표시명·업종·칩·한 줄 또는 음성 재생. 텍스트 변환 없음. 칸 아래 고정 1줄로 후기 칸과 구분.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchApprovedTakes } from '../lib/vendorTakes'
import { approvedOrdered } from '../lib/vendorTakesRules'
import { TAKES_COPY } from '../../config/vendorTakes'
import { logEvent } from '../lib/eventLog'

const PURPLE = '#7d4ba3'

export default function VendorTakesSection({ vendor, isOwner = false }) {
  const navigate = useNavigate()
  const [takes, setTakes] = useState(null)
  useEffect(() => {
    if (!vendor?.user_id) { setTakes([]); return }
    fetchApprovedTakes(vendor.user_id).then(rows => { const list = approvedOrdered(rows); setTakes(list); if (list.length) logEvent('take_section_view', { n: list.length }) })
  }, [vendor?.user_id])
  if (takes === null) return null
  if (!takes.length && !isOwner) return null
  return (
    <section className="mt-6 mb-4" data-testid="takes-section">
      <div className="flex items-center justify-between">
        <p className="text-t15 font-bold text-gray-900">{TAKES_COPY.sectionTitle}</p>
        {isOwner && <button type="button" onClick={() => navigate('/business/takes')} data-testid="takes-manage-link" className="text-t12 font-bold" style={{ color: PURPLE }}>관리 →</button>}
      </div>
      {takes.length > 0 ? (
        <div className="mt-2 rounded-2xl border border-gray-100 divide-y divide-gray-50" data-testid="takes-list">
          {takes.map(t => (
            <div key={t.id} className="px-4 py-3" data-testid="take-item">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-t13 font-bold text-gray-900">{t.display_name}</span>
                {t.business_type && <span className="text-t11 text-gray-500">{t.business_type}</span>}
                <span className="text-t10 font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#f5eefb', color: PURPLE }}>{t.chip}</span>
              </div>
              {t.body && <p className="text-t14 text-gray-800 mt-1 leading-snug">{t.body}</p>}
              {t.voice_url && <audio controls preload="none" src={t.voice_url} className="mt-2 w-full" data-testid="take-audio" />}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-t13 text-gray-400 mt-1">아직 올린 한마디가 없어요</p>
      )}
      <p className="text-t11 text-gray-400 mt-2" data-testid="takes-foot">{TAKES_COPY.sectionFoot}</p>
    </section>
  )
}
