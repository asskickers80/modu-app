/**
 * 기업회원 문의 채널 이원화 — [문의하기](앱 내, 기본·강조) + [전화하기] (ORDER 2026-09-09 파트 B)
 * 대표 결정(2026-09-09): 앱 내 문의는 기본값이지 강제가 아니다. 막는 것은 없고 기록만 한다.
 * - [전화하기]는 기업회원이 번호를 등록했을 때만 렌더. tel: 앞에 아무 화면도 끼우지 않고 클릭만 원장에 기록.
 * - [문의하기]는 전송 전 자동 첨부 미리보기 1화면(업종·지역·상황 — 각각 해제 가능, 매출 금액은 첨부하지 않는다).
 * 기업회원이 노출되는 모든 곳에서 이 컴포넌트만 쓴다(복제 금지).
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../lib/userProfile'
import { logEvent } from '../lib/eventLog'
import { recordInquiry } from '../lib/inquiryLedger'
import { attachmentItems, buildAttachment, revenueBandOf, sendVendorInquiry } from '../lib/vendorInquiry'
import WatchButton from './WatchButton'
import { useToast } from '../hooks/useToast'
import Toast from './Toast'

// 기업회원 상세·목록에서 왔을 때 상황 한 줄 = 사용자 축 이름만
const AXIS_SITUATION = {
  seller: '양도 준비 중', operating: '가게 운영 중', landlord: '상가 임대 중', startup: '창업 준비 중',
}

export function BottomSheet({ onClose, children, testId }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto"
        data-testid={testId} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function Toggle({ on, onChange, label, testId }) {
  return (
    <button type="button" onClick={() => onChange(!on)} data-testid={testId} aria-pressed={on}
      className="w-full flex items-center justify-between py-3 min-h-11">
      <span className="text-t14 text-gray-800">{label}</span>
      <span className="w-11 h-6 rounded-full relative transition-colors" style={{ backgroundColor: on ? '#111827' : '#e5e7eb' }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: on ? 22 : 2 }} />
      </span>
    </button>
  )
}

function InquiryAttachSheet({ vendor, source, signal, category, situationLine, entries, accent, onClose }) {
  const navigate = useNavigate()
  const profile = getProfile()
  const bizLabel = profile.bizLabel ?? profile.category_main ?? null
  const regionLabel = [profile.region, profile.region_sub].filter(Boolean).join(' ') || null
  const items = useMemo(() => attachmentItems({ bizLabel, regionLabel, situationLine }), [bizLabel, regionLabel, situationLine])
  const band = useMemo(() => revenueBandOf(entries), [entries])
  const [enabled, setEnabled] = useState({})
  const [bandOn, setBandOn] = useState(false) // 기본 꺼짐 — 사용자가 켤 때만
  const [sending, setSending] = useState(false)

  const toggle = (key, on) => {
    setEnabled(prev => ({ ...prev, [key]: on }))
    logEvent('inquiry_attachment_toggled', { field: key, on })
  }
  const toggleBand = (on) => { setBandOn(on); logEvent('inquiry_attachment_toggled', { field: 'sales_band', on }) }

  const send = async () => {
    setSending(true)
    const body = buildAttachment(items, enabled, bandOn ? band : null)
    const r = await sendVendorInquiry({ vendor, body, source, signal, category })
    logEvent('vendor_inquiry', { vendor_id: vendor.id, channel: 'app', source })
    setSending(false)
    if (r.ok && r.conversationId) navigate(`/d4/chat/${r.conversationId}`)
    else onClose()
  }

  return (
    <BottomSheet onClose={onClose} testId="inquiry-attach-sheet">
      <p className="text-t16 font-black text-gray-900">{vendor.name}에 문의하기</p>
      <p className="text-t12 text-gray-400 mt-0.5 mb-2">아래 정보가 함께 보내져요 — 빼고 싶은 건 끄세요</p>
      <div className="divide-y divide-gray-50">
        {items.map(it => (
          <Toggle key={it.key} on={enabled[it.key] !== false} onChange={on => toggle(it.key, on)}
            label={`${it.label} · ${it.value}`} testId={`attach-${it.key}`} />
        ))}
        {band && (
          <Toggle on={bandOn} onChange={toggleBand} label={`최근 3개월 매출 구간 · ${band}`} testId="attach-sales-band" />
        )}
      </div>
      <p className="text-t11 text-gray-400 mt-2">이 정보는 이 업체에게만 보내져요</p>
      <button type="button" onClick={send} disabled={sending} data-testid="inquiry-send"
        className="mt-4 w-full py-3.5 rounded-2xl text-t15 font-bold text-white disabled:opacity-60"
        style={{ backgroundColor: accent }}>
        {sending ? '보내는 중…' : '문의 보내기'}
      </button>
    </BottomSheet>
  )
}

/**
 * @param vendor { id, name, phone, deviceId }
 * @param source sales_card | vendor_profile | demand_signal | other
 * @param situationLine 파트 A에서 왔으면 카드 1줄째. 없으면 사용자 축 이름
 * @param entries 매출 구간 계산용 daily_sales 행(있을 때만 토글 노출)
 */
export default function VendorContactButtons({ vendor, source = 'vendor_profile', signal = null, category = null, situationLine = null, entries = [], accent = '#7d4ba3', compact = false, showToast = null }) {
  const [sheet, setSheet] = useState(false)
  const situation = situationLine ?? AXIS_SITUATION[getProfile().category] ?? null
  const local = useToast() // 호출부에 토스트 호스트가 없으면 자체 표시 (찜 즉시 응답)
  const notify = showToast ?? local.showToast

  const onPhone = () => {
    // tel: 연결 전에 아무 화면도 끼우지 않는다 — 클릭만 기록
    recordInquiry({ vendorId: vendor.id, source, signal, category, channel: 'phone', status: 'sent' })
    logEvent('vendor_inquiry', { vendor_id: vendor.id, channel: 'phone', source })
  }

  const h = compact ? 'py-2 text-t12' : 'py-3 text-t14'
  return (
    <>
      <div className="flex gap-2 items-center" data-testid="vendor-contact">
        <WatchButton type="vendor" id={vendor.id} showToast={notify} accent={accent} testId="watch-vendor" />
        <button type="button" onClick={() => setSheet(true)} data-testid="vendor-inquire"
          className={`flex-1 rounded-xl font-bold text-white ${h}`} style={{ backgroundColor: accent }}>
          문의하기
        </button>
        {vendor.phone && (
          <a href={`tel:${vendor.phone}`} onClick={onPhone} data-testid="vendor-call"
            className={`flex-1 rounded-xl font-semibold text-center text-gray-700 bg-gray-100 ${h}`}>
            전화하기
          </a>
        )}
      </div>
      {sheet && (
        <InquiryAttachSheet vendor={vendor} source={source} signal={signal} category={category}
          situationLine={situation} entries={entries} accent={accent} onClose={() => setSheet(false)} />
      )}
      {!showToast && local.toast && <Toast message={local.toast} />}
    </>
  )
}
