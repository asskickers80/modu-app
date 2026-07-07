import {
  CONTRACT_TITLE, CONTRACT_PREAMBLE, CONTRACT_TERMS, BANK_INFO, COMPANY,
} from '../data/contract.js'
import { formatKoreanDate } from '../lib/format.js'

const won = n => `${Number(n || 0).toLocaleString('ko-KR')}원`

function Field({ label, value, bold = false, span = false }) {
  return (
    <div className={`flex border-b border-gray-200 ${span ? 'col-span-2' : ''}`}>
      <div className="w-24 shrink-0 bg-gray-50 px-2 py-2 text-[11px] font-semibold text-gray-500">{label}</div>
      <div className={`flex-1 px-2 py-2 text-[13px] ${bold ? 'font-bold' : ''} text-gray-900`}>{value || <span className="text-gray-300">—</span>}</div>
    </div>
  )
}

// 계약서 전문 렌더링 — 미리보기·고객 열람 화면 공용
export default function ContractPaper({ contract }) {
  const c = contract
  return (
    <div className="bg-white px-5 py-6 text-gray-900">
      <h1 className="text-center text-lg font-bold underline underline-offset-4">{CONTRACT_TITLE}</h1>

      <p className="mt-4 text-[12px] leading-relaxed text-gray-700">{CONTRACT_PREAMBLE}</p>

      {/* 계약 내용 표 */}
      <div className="mt-4 grid grid-cols-2 rounded-lg border border-gray-300 text-sm">
        <Field label="상호" value={c.storeName} />
        <Field label="업종" value={c.businessType} />
        <Field label="사업자등록번호" value={c.bizNo} />
        <Field label="담당 에이전트" value={c.agentName} />
        <Field label="소재지" value={c.address} span />
        <Field label="광고상품명" value={c.productName} />
        <Field label="광고료" value={`${won(c.fee)} (부가세 별도)`} />
        <Field label="부가세" value={won(c.vat)} />
        <Field label="총액" value={won(c.total)} bold />
        <Field label="광고개시일" value={formatKoreanDate(c.startDate)} />
        <Field label="광고기간" value={`${c.periodMonths}개월`} />
        <Field label="광고종료일" value={formatKoreanDate(c.endDate)} span />
      </div>

      {/* 입금계좌 */}
      <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2.5 text-[13px]">
        <span className="font-semibold text-blue-900">{BANK_INFO.label}</span>{' '}
        <span className="text-blue-900">{BANK_INFO.bank} {BANK_INFO.account} (예금주: {BANK_INFO.holder})</span>
      </div>

      {/* 약관 제1조~제7조 */}
      <div className="mt-5 space-y-3">
        {CONTRACT_TERMS.map(term => (
          <div key={term.title}>
            <h3 className={`text-[12px] font-bold ${term.emphasis ? 'text-red-600' : 'text-gray-900'}`}>{term.title}</h3>
            <p className={`mt-0.5 text-[12px] leading-relaxed ${term.emphasis ? 'text-red-600 underline underline-offset-2' : 'text-gray-700'}`}>
              {term.body}
            </p>
          </div>
        ))}
      </div>

      {/* 회사 정보 */}
      <div className="mt-6 border-t border-gray-200 pt-3 text-[12px] text-gray-500">
        <p>주소: {COMPANY.address}</p>
        <p>상호: {COMPANY.name} · 대표이사: {COMPANY.ceo}</p>
      </div>
    </div>
  )
}
