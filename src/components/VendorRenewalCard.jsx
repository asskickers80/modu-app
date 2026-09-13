/**
 * 기업회원 홈 '갱신 전 확인' 카드 (ORDER 2026-09-13 파트 B2) — 갱신 D-7.
 * 사실 숫자만. 0건도 숨기지 않는다. 할인·만류 문구 없음(PRICING §1-4).
 */
import { useEffect, useRef, useState } from 'react'
import { fetchRenewalReport, markReportShown } from '../lib/vendorRenewal'
import { RENEWAL_COPY } from '../../config/vendorRenewal'

const PURPLE = '#7d4ba3'

export default function VendorRenewalCard() {
  const [data, setData] = useState(null)
  const logged = useRef(false)
  useEffect(() => { fetchRenewalReport().then(setData) }, [])
  useEffect(() => {
    if (data?.due && !logged.current) { logged.current = true; markReportShown(data.daysLeft) }
  }, [data])
  if (!data?.due) return null
  return (
    <section className="rounded-2xl border px-4 py-3.5 mb-4" style={{ borderColor: `${PURPLE}33`, backgroundColor: '#faf6fd' }} data-testid="renewal-card">
      <div className="flex items-center gap-2">
        <p className="text-t13 font-bold" style={{ color: PURPLE }}>{RENEWAL_COPY.title}</p>
        <span className="text-t11 text-gray-500" data-testid="renewal-days">{RENEWAL_COPY.dueIn.replace('{d}', String(data.daysLeft))}</span>
      </div>
      {data.lines.map((l, i) => (
        <p key={i} className="text-t13 text-gray-800 mt-1.5 leading-snug" data-testid={i === 0 ? 'renewal-line' : i === 1 ? 'renewal-sources' : 'renewal-deals'}>{l}</p>
      ))}
      <p className="text-t11 text-gray-400 mt-2">{RENEWAL_COPY.notice}</p>
    </section>
  )
}
