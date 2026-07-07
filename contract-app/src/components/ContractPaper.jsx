import {
  CONTRACT_SUBTITLE, CONTRACT_DOC_TYPE, CONTRACT_TITLE, PROPERTY_TABLE_LABEL,
  CONTRACT_PREAMBLE, CONTRACT_DAUM, CONTRACT_TERMS, HANDWRITTEN_NOTICE,
  HANDWRITTEN_PLACEHOLDER, CLOSING_SENTENCE, BANK_INFO, COMPANY, toSegments,
} from '../data/contract.js'
import { formatKoreanDate, toDateInputValue } from '../lib/format.js'

const won = n => `${Number(n || 0).toLocaleString('ko-KR')}원`

// __밑줄__ 마커 렌더링
function Rich({ text }) {
  return toSegments(text).map((seg, i) =>
    seg.u ? <u key={i} className="underline-offset-2">{seg.text}</u> : <span key={i}>{seg.text}</span>,
  )
}

function Cell({ label, value, labelW = 'w-20' }) {
  return (
    <div className="flex flex-1 items-stretch">
      <div className={`${labelW} shrink-0 border-r border-gray-300 bg-gray-100 px-1.5 py-2 text-[11px] font-semibold text-gray-600`}>{label}</div>
      <div className="flex-1 px-2 py-2 text-[13px] text-gray-900">{value || <span className="text-gray-300">—</span>}</div>
    </div>
  )
}

// 계약서 전문 렌더링 — 원본(A청색NCR 3차 수정약관) 레이아웃 재현. 미리보기·고객 열람 공용
export default function ContractPaper({ contract }) {
  const c = contract
  const today = formatKoreanDate(toDateInputValue(new Date()))
  return (
    <div className="bg-white px-5 py-6 text-gray-900">
      <div className="flex items-baseline justify-between text-[10px] text-gray-500">
        <span>{CONTRACT_SUBTITLE}</span>
        <span>{CONTRACT_DOC_TYPE}</span>
      </div>
      <h1 className="mt-1 text-center text-lg font-bold tracking-wide">{CONTRACT_TITLE}</h1>

      {/* 광고 대상 매물의 표시 */}
      <p className="mt-3 text-[11px] font-semibold text-gray-600">{PROPERTY_TABLE_LABEL}</p>
      <div className="mt-1 divide-y divide-gray-300 rounded border border-gray-300">
        <div className="flex divide-x divide-gray-300">
          <Cell label="상호" value={c.storeName} labelW="w-14" />
          <Cell label="업종" value={c.businessType} labelW="w-14" />
          <Cell label="사업자등록번호" value={c.bizNo} />
        </div>
        <div className="flex divide-x divide-gray-300">
          <Cell label="소재지" value={c.address} labelW="w-14" />
          <Cell label="담당 에이전트" value={c.agentName} />
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-gray-700">{CONTRACT_PREAMBLE}</p>
      <p className="mt-2 text-center text-[12px] font-bold tracking-widest">{CONTRACT_DAUM}</p>

      {/* 약관 제1조~제7조 */}
      <div className="mt-3 space-y-3">
        {CONTRACT_TERMS.map(term => (
          <div key={term.title}>
            <h3 className="text-[12.5px] font-bold text-gray-900">{term.title}</h3>
            {term.adTable && (
              <div className="mt-1.5 overflow-hidden rounded border border-gray-300 text-center">
                <div className="grid grid-cols-7 divide-x divide-gray-300 bg-gray-100 text-[10px] font-semibold text-gray-600">
                  {['광고상품명', '광고료', '부가세', '총액', '광고개시일', '광고종료일', '광고기간'].map(h => (
                    <div key={h} className="px-0.5 py-1.5">{h}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 divide-x divide-gray-300 border-t border-gray-300 text-[11px]">
                  <div className="px-0.5 py-2">{c.productName}</div>
                  <div className="px-0.5 py-2">{won(c.fee)}</div>
                  <div className="px-0.5 py-2">{won(c.vat)}</div>
                  <div className="px-0.5 py-2 font-bold">{won(c.total)}</div>
                  <div className="px-0.5 py-2">{formatKoreanDate(c.startDate)}</div>
                  <div className="px-0.5 py-2">{formatKoreanDate(c.endDate)}</div>
                  <div className="px-0.5 py-2">( {c.periodMonths} )개월간</div>
                </div>
              </div>
            )}
            <p className="mt-1 text-[12px] leading-relaxed text-gray-700"><Rich text={term.body} /></p>
            {term.bankAfter && (
              <div className="mt-2.5 rounded border-2 border-gray-800 bg-gray-50 px-3 py-2 text-center text-[13px] font-bold">
                {BANK_INFO.label} : {BANK_INFO.bank}&nbsp;&nbsp;{BANK_INFO.account}&nbsp;&nbsp;예금주: {BANK_INFO.holder}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 자필 확인란 (원본 박스 — 실제 작성은 아래 서명 단계에서) */}
      <div className="mt-4 flex overflow-hidden rounded border-2 border-gray-800">
        <p className="flex-1 px-3 py-2.5 text-[12px] leading-relaxed text-gray-800"><Rich text={HANDWRITTEN_NOTICE} /></p>
        <div className="flex w-28 shrink-0 flex-col border-l-2 border-gray-800">
          <span className="border-b border-gray-300 px-1 py-1 text-center text-[10px] font-semibold text-gray-500">자필 확인 란</span>
          <span className="flex flex-1 items-center justify-center text-xl font-bold tracking-widest text-gray-200">{HANDWRITTEN_PLACEHOLDER}</span>
        </div>
      </div>

      {/* 마무리 문구 + 날짜 */}
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold">{CLOSING_SENTENCE}</p>
        <p className="shrink-0 text-[12px] text-gray-700">{today}</p>
      </div>

      {/* 서명 영역 */}
      <div className="mt-2 divide-y divide-gray-300 rounded border border-gray-300 text-[12px]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="font-semibold text-gray-600">광고주</span>
          <span className="ml-4">성&nbsp;&nbsp;&nbsp;명: {c.customerName || '____________'}</span>
          <span className="text-gray-400">(인)</span>
        </div>
        <div className="px-3 py-2.5 text-gray-700">
          <p>주 소: {COMPANY.address}</p>
          <p className="mt-0.5">상 호: {COMPANY.name} &nbsp; 대표이사: {COMPANY.ceo}</p>
        </div>
      </div>
    </div>
  )
}
