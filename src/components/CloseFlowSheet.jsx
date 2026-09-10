/**
 * 매물(상가) 마감 흐름 시트 — E2(양도인)·E2L(소유주) 공용 (ORDER-close-flow-peer-stats-v1 항목 2)
 *
 * 3단계: [1] 어떻게 됐어요(사유) → [2] 팔렸어요만: 설문(가격대·채널)=프리미엄 1개월
 *        → [3] 알림 신청(전부 건너뛰기 가능) → "고생 많으셨어요"
 * 커밋 시점 = 1단계 칩 선택(상태 전환 + 설문 insert). 그 전 X = 무변경,
 * 그 후 X = 마무리와 동일(홈 이동) — 상태는 이미 바뀌었으므로 화면 잔류 금지.
 * 어휘 규칙: 양도인 "매물·권리금·동향" / 소유주 "상가·매매가·임대료·시세". "가게" 금지.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateListingStatus, softDeleteListing } from '../lib/listingStatus'
import { notifyStatusChange } from '../lib/watchlist'
import { saveCloseSurvey, updateCloseSurvey, grantPremium, computeRepostRemindAt, nextHolidayRepost, recordDeal } from '../lib/closeFlow'
import { logEvent } from '../lib/eventLog'
import { saveRoleData, getProfiles, completeLoggedInRoleAdd, saveProfile } from '../lib/userProfile'
import { syncProfileDataToServer } from '../lib/auth'
import RegionPicker from './RegionPicker'
import IndustryPicker from './IndustryPicker'
import CloseFlowDoneNotes from './CloseFlowDoneNotes'

const AXIS = {
  seller:   { noun: '매물', color: '#1a4d8f', home: '/a7/seller' },
  landlord: { noun: '상가', color: '#1e6b6b', home: '/a7/landlord' },
}

// 소유주는 거래 형태(deal_type)에 따라 "팔렸어요" 문안 분기 (임대=임차인, 매각=팔림)
const soldLabelOf = (axis, listing) => {
  if (axis === 'seller') return '팔렸어요'
  if (listing?.deal_type === 'lease') return '임차인 구했어요'
  if (listing?.deal_type === 'sale') return '팔렸어요'
  return '거래됐어요' // both·미지정 — 임대·매각 어느 쪽이든
}

const priceQuestionOf = (axis, listing) => {
  if (axis === 'seller') return '최종 권리금은 어땠어요?'
  if (listing?.deal_type === 'lease') return '최종 임대료는 어땠어요?'
  if (listing?.deal_type === 'sale') return '최종 매매가는 어땠어요?'
  return '최종 가격은 어땠어요?'
}

const PRICE_BANDS = [
  { id: 'same', label: '처음 가격 그대로' },
  { id: 'adj_10', label: '10% 이내 조정' },
  { id: 'adj_10_30', label: '10~30% 조정' },
  { id: 'adj_30plus', label: '30% 이상 조정' },
]
const CHANNELS = [
  { id: 'modu', label: '모두에서' },
  { id: 'broker', label: '부동산' },
  { id: 'direct', label: '지인·직거래' },
]
const PLANS = [
  { id: 'find', label: '다른 매물 찾을 거예요' },
  { id: 'operating', label: '다른 점포 운영 중이에요' },
  { id: 'rest', label: '당분간 쉴 거예요' },
  { id: 'unknown', label: '아직 몰라요' },
]

const Chip = ({ children, selected, onClick, testId, color, disabled }) => (
  <button onClick={onClick} data-testid={testId} disabled={disabled}
    className="w-full py-4 px-4 rounded-2xl text-t16 font-bold text-left border-2 active:scale-[0.98] transition-transform disabled:opacity-50"
    style={selected
      ? { borderColor: color, color, backgroundColor: '#fff' }
      : { borderColor: '#e5e7eb', color: '#374151', backgroundColor: '#fff' }}>
    {children}
  </button>
)

const Toggle = ({ label, on, onChange, testId, color }) => (
  <button onClick={() => onChange(!on)} data-testid={testId}
    className="w-full flex items-center justify-between gap-3 py-3.5 px-4 rounded-2xl border border-gray-200 bg-white">
    <span className="text-t14 font-medium text-gray-700 text-left leading-snug">{label}</span>
    <span className="shrink-0 w-12 h-7 rounded-full relative transition-colors"
      style={{ backgroundColor: on ? color : '#d1d5db' }}>
      <span className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all"
        style={{ left: on ? '22px' : '2px' }} />
    </span>
  </button>
)

export default function CloseFlowSheet({ listing, axis, onClose, onPlainDelete, showToast }) {
  const navigate = useNavigate()
  const cfg = AXIS[axis] ?? AXIS.seller
  const [step, setStep] = useState('reason')
  const [busy, setBusy] = useState(false)
  const [surveyId, setSurveyId] = useState(null)
  const [committed, setCommitted] = useState(false) // 상태 전환·설문이 일어난 뒤인가
  // 2단계 설문
  const [band, setBand] = useState(null)
  const [channel, setChannel] = useState(null)
  // 3단계
  const [reason, setReason] = useState(null)
  const [wishRegion, setWishRegion] = useState({ main: null, sub: null })
  const [wishIndustry, setWishIndustry] = useState({ main: null, sub: null, ksic: null })
  const [leaseMonth, setLeaseMonth] = useState('')
  const [repostChoice, setRepostChoice] = useState(null) // 'month' | 'holiday' | 'custom'
  const [customDate, setCustomDate] = useState('')
  const [peerTrend, setPeerTrend] = useState(false)
  const [myValue, setMyValue] = useState(false)

  useEffect(() => { logEvent('close_flow_open', { listingId: listing.id, axis }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => navigate(cfg.home, { replace: true })
  // 커밋 전 X = 무변경 닫기, 커밋 후 X = 홈 이동 (상태가 이미 바뀌어 화면 잔류 금지)
  const handleX = () => { if (committed) finish(); else onClose() }

  const pickReason = async (r) => {
    if (busy) return
    setBusy(true)
    const { error } = r === 'keep'
      ? await softDeleteListing(listing.id)
      : await updateListingStatus(listing.id, r === 'sold' ? 'sold' : 'hidden')
    if (error) {
      showToast?.('처리에 실패했어요. 다시 시도해 주세요.')
      setBusy(false)
      return
    }
    logEvent('close_reason_selected', { listingId: listing.id, reason: r })
    // 찜한 사람에게 status 알림(+비슷한 매물 링크) — 실패는 삼킨다 (파트 A3)
    notifyStatusChange(listing, r === 'sold' ? 'sold' : r === 'keep' ? 'deleted' : 'hidden').catch(() => {})
    const s = await saveCloseSurvey({ listingId: listing.id, closeReason: r })
    setSurveyId(s.id)
    setReason(r)
    setCommitted(true)
    setStep(r === 'sold' ? 'survey' : r)
    setBusy(false)
  }

  const submitSurvey = async () => {
    if (!band || !channel || busy) return
    setBusy(true)
    await updateCloseSurvey(surveyId, { final_price_band: band, deal_channel: channel })
    logEvent('sold_survey_completed', { listingId: listing.id, band, channel })
    // 비식별 원장 — 설문 값이 확정된 시점에 1회 적재(식별자 없음)
    recordDeal({ listing, band, channel })
    const { ok } = await grantPremium({ days: 30, reason: 'sold_survey' })
    if (ok) {
      logEvent('premium_granted', { listingId: listing.id })
      showToast?.('프리미엄 1개월이 적용됐어요')
    }
    setStep('plan')
    setBusy(false)
  }

  const pickPlan = async (p) => {
    if (busy) return
    setBusy(true)
    await updateCloseSurvey(surveyId, { next_plan: p })
    logEvent('next_plan_selected', { listingId: listing.id, plan: p })
    if (p === 'find') setStep('planFind')
    else if (p === 'operating') setStep('planLease')
    else setStep('done')
    setBusy(false)
  }

  // 팔렸어요 → 다른 매물 찾기: 창업 프로필 생성(없으면) + 희망 조건 저장
  const saveWish = () => {
    completeLoggedInRoleAdd('startup') // 없으면 생성, 있으면 활성 전환 — 같은 관문
    saveProfile({
      wish_region: wishRegion.main, wish_region_sub: wishRegion.sub,
      wish_industry_main: wishIndustry.main, wish_industry_sub: wishIndustry.sub,
      wish_ksic: wishIndustry.ksic,
    })
    logEvent('alert_opt_in', { listingId: listing.id, type: 'wish' })
    setStep('done')
  }

  // 팔렸어요 → 다른 점포 운영 중: 사장님 축에 임대차 만료 저장 (프로필 없으면 생성)
  const saveLease = () => {
    if (!getProfiles().some(p => p.category === 'operating')) completeLoggedInRoleAdd('operating')
    if (leaseMonth) {
      saveRoleData('operating', { lease_end_date: leaseMonth })
      syncProfileDataToServer()
      logEvent('alert_opt_in', { listingId: listing.id, type: 'lease_end' })
    }
    setStep('done')
  }

  // 잠깐 쉴게요: 재등록 시기 + 동향(시세) 토글
  const saveRest = () => {
    const remindAt = computeRepostRemindAt(
      repostChoice === 'custom' ? new Date(customDate) : repostChoice)
    const fields = {}
    if (remindAt) { fields.repost_remind_at = remindAt; logEvent('alert_opt_in', { listingId: listing.id, type: 'repost_remind' }) }
    if (peerTrend) { fields.alert_peer_trend = true; logEvent('alert_opt_in', { listingId: listing.id, type: 'peer_trend' }) }
    if (Object.keys(fields).length) {
      saveRoleData(axis, fields)
      syncProfileDataToServer()
    }
    setStep('done')
  }

  // 계속 운영(보유): 내 매물(상가) 동향·시세 토글 + 임대차 만료
  const saveKeep = () => {
    const fields = {}
    if (myValue) { fields.alert_my_value = true; logEvent('alert_opt_in', { listingId: listing.id, type: 'my_value' }) }
    if (leaseMonth) { fields.lease_end_date = leaseMonth; logEvent('alert_opt_in', { listingId: listing.id, type: 'lease_end' }) }
    if (Object.keys(fields).length) {
      saveRoleData(axis, fields)
      syncProfileDataToServer()
    }
    setStep('done')
  }

  const skip = (s) => {
    logEvent('close_flow_skipped', { listingId: listing.id, step: s })
    // 설문을 건너뛰어도 "팔렸다"는 사실은 원장에 남긴다 — 가격대·채널은 null(지어내지 않는다)
    if (s === 'survey') recordDeal({ listing })
    setStep(s === 'survey' ? 'plan' : 'done')
  }

  const holiday = nextHolidayRepost()
  const soldLabel = soldLabelOf(axis, listing)
  const keepLabel = axis === 'seller' ? '계속 운영하기로 했어요' : '계속 보유하기로 했어요'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="close-flow-sheet">
      <div className="absolute inset-0 bg-black/40" onClick={handleX} />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl px-5 pt-5 pb-9 shadow-2xl max-h-[85vh] overflow-y-auto">
        <button onClick={handleX} data-testid="close-flow-x" aria-label="닫기"
          className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center text-gray-400 text-t18">✕</button>
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />

        {step === 'reason' && (
          <div>
            <p className="text-t19 font-bold text-gray-900 leading-snug mb-1">
              {cfg.noun}{axis === 'seller' ? '을' : '를'} 내리시는군요.
            </p>
            <p className="text-t19 font-bold text-gray-900 mb-5">어떻게 됐어요?</p>
            <div className="flex flex-col gap-2.5">
              <Chip testId="close-reason-sold" color={cfg.color} disabled={busy}
                onClick={() => pickReason('sold')}>🎉 {soldLabel}</Chip>
              <Chip testId="close-reason-rest" color={cfg.color} disabled={busy}
                onClick={() => pickReason('rest')}>😌 잠깐 쉴게요</Chip>
              <Chip testId="close-reason-keep" color={cfg.color} disabled={busy}
                onClick={() => pickReason('keep')}>💪 {keepLabel}</Chip>
            </div>
            <button onClick={() => { logEvent('close_flow_skipped', { listingId: listing.id, step: 'reason' }); onPlainDelete() }}
              data-testid="close-plain-delete"
              className="w-full mt-4 py-3 text-t13 text-gray-400 underline underline-offset-2">
              그냥 삭제할게요
            </button>
          </div>
        )}

        {step === 'survey' && (
          <div>
            <p className="text-t19 font-bold text-gray-900 mb-1">축하드려요 🎉</p>
            <p className="text-t14 text-gray-500 leading-relaxed mb-5">
              두 가지만 알려주시면 프리미엄 1개월을 드릴게요.
            </p>
            <p className="text-t14 font-bold text-gray-700 mb-2">{priceQuestionOf(axis, listing)}</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {PRICE_BANDS.map(b => (
                <button key={b.id} onClick={() => setBand(b.id)} data-testid={`price-band-${b.id}`}
                  className="py-3.5 px-2 rounded-2xl text-t14 font-semibold border-2"
                  style={band === b.id ? { borderColor: cfg.color, color: cfg.color } : { borderColor: '#e5e7eb', color: '#4b5563' }}>
                  {b.label}
                </button>
              ))}
            </div>
            <p className="text-t14 font-bold text-gray-700 mb-2">어디서 만난 분이에요?</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {CHANNELS.map(c => (
                <button key={c.id} onClick={() => setChannel(c.id)} data-testid={`deal-channel-${c.id}`}
                  className="py-3.5 px-1 rounded-2xl text-t13 font-semibold border-2"
                  style={channel === c.id ? { borderColor: cfg.color, color: cfg.color } : { borderColor: '#e5e7eb', color: '#4b5563' }}>
                  {c.label}
                </button>
              ))}
            </div>
            <button onClick={submitSurvey} disabled={!band || !channel || busy} data-testid="sold-survey-done"
              className="w-full py-[16px] rounded-2xl text-t15 font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: cfg.color }}>
              완료
            </button>
            <button onClick={() => skip('survey')} data-testid="sold-survey-skip"
              className="w-full mt-1.5 py-3 text-t13 text-gray-400">건너뛰기</button>
          </div>
        )}

        {step === 'plan' && (
          <div>
            <p className="text-t19 font-bold text-gray-900 mb-5">다음은 어떻게 하실 계획이세요?</p>
            <div className="flex flex-col gap-2.5 mb-2">
              {PLANS.map(p => (
                <Chip key={p.id} testId={`plan-${p.id}`} color={cfg.color} disabled={busy}
                  onClick={() => pickPlan(p.id)}>{p.label}</Chip>
              ))}
            </div>
            <button onClick={() => skip('plan')} data-testid="plan-skip"
              className="w-full py-3 text-t13 text-gray-400">건너뛰기</button>
          </div>
        )}

        {step === 'planFind' && (
          <div>
            <p className="text-t19 font-bold text-gray-900 leading-snug mb-5">
              어느 동네, 어떤 업종이면<br />알려드릴까요?
            </p>
            <p className="text-t13 font-bold text-gray-500 mb-2">동네</p>
            <RegionPicker value={wishRegion} onChange={setWishRegion} />
            <p className="text-t13 font-bold text-gray-500 mt-5 mb-2">업종</p>
            <IndustryPicker value={wishIndustry} onChange={setWishIndustry} />
            <button onClick={saveWish} disabled={!wishRegion.main && !wishIndustry.main} data-testid="plan-find-save"
              className="w-full mt-6 py-[16px] rounded-2xl text-t15 font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: cfg.color }}>
              이 조건이면 알려주세요
            </button>
            <button onClick={() => skip('planFind')} data-testid="plan-find-skip"
              className="w-full mt-1.5 py-3 text-t13 text-gray-400">나중에 할게요</button>
          </div>
        )}

        {step === 'planLease' && (
          <div>
            <p className="text-t19 font-bold text-gray-900 leading-snug mb-2">
              그 점포 임대차 만료가<br />언제예요?
            </p>
            <p className="text-t13 text-gray-400 mb-5">만료 6개월 전부터 미리 알려드릴게요</p>
            <input type="month" value={leaseMonth} onChange={e => setLeaseMonth(e.target.value)}
              data-testid="lease-month-input"
              className="w-full py-3.5 px-4 rounded-2xl border border-gray-200 text-t15" />
            <button onClick={saveLease} disabled={!leaseMonth} data-testid="plan-lease-save"
              className="w-full mt-5 py-[16px] rounded-2xl text-t15 font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: cfg.color }}>
              저장
            </button>
            <button onClick={() => skip('planLease')} data-testid="plan-lease-skip"
              className="w-full mt-1.5 py-3 text-t13 text-gray-400">나중에 할게요</button>
          </div>
        )}

        {step === 'rest' && (
          <div>
            <p className="text-t19 font-bold text-gray-900 mb-5">언제쯤 다시 올려드릴까요?</p>
            <div className="flex flex-col gap-2.5 mb-4">
              <Chip testId="repost-month" color={cfg.color} selected={repostChoice === 'month'}
                onClick={() => setRepostChoice('month')}>한 달 뒤</Chip>
              {holiday && (
                <Chip testId="repost-holiday" color={cfg.color} selected={repostChoice === 'holiday'}
                  onClick={() => setRepostChoice('holiday')}>명절 지나고 ({holiday.name} 뒤)</Chip>
              )}
              <Chip testId="repost-custom" color={cfg.color} selected={repostChoice === 'custom'}
                onClick={() => setRepostChoice('custom')}>내가 정할게요</Chip>
              {repostChoice === 'custom' && (
                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                  data-testid="repost-custom-date"
                  className="w-full py-3.5 px-4 rounded-2xl border border-gray-200 text-t15" />
              )}
            </div>
            <Toggle testId="alert-peer-toggle" color={cfg.color} on={peerTrend} onChange={setPeerTrend}
              label={axis === 'seller'
                ? '쉬는 동안 비슷한 매물 동향 알려드릴까요?'
                : '쉬는 동안 이 상권 시세 알려드릴까요?'} />
            <button onClick={saveRest} data-testid="rest-save"
              className="w-full mt-5 py-[16px] rounded-2xl text-t15 font-bold text-white"
              style={{ backgroundColor: cfg.color }}>
              확인
            </button>
            <button onClick={() => skip('rest')} data-testid="rest-skip"
              className="w-full mt-1.5 py-3 text-t13 text-gray-400">건너뛰기</button>
          </div>
        )}

        {step === 'keep' && (
          <div>
            <p className="text-t19 font-bold text-gray-900 mb-5">
              {axis === 'seller' ? '잘 생각하셨어요 💪' : '알겠어요 💪'}
            </p>
            <div className="flex flex-col gap-2.5 mb-4">
              <Toggle testId="alert-value-toggle" color={cfg.color} on={myValue} onChange={setMyValue}
                label={axis === 'seller'
                  ? '내 매물 동향이 바뀌면 알려드릴까요?'
                  : '상가 시세가 오르내리면 알려드릴까요?'} />
            </div>
            <p className="text-t14 font-bold text-gray-700 mb-2">임대차 만료가 언제예요?</p>
            <input type="month" value={leaseMonth} onChange={e => setLeaseMonth(e.target.value)}
              data-testid="keep-lease-input"
              className="w-full py-3.5 px-4 rounded-2xl border border-gray-200 text-t15" />
            <button onClick={saveKeep} data-testid="keep-save"
              className="w-full mt-5 py-[16px] rounded-2xl text-t15 font-bold text-white"
              style={{ backgroundColor: cfg.color }}>
              확인
            </button>
            <button onClick={() => skip('keep')} data-testid="keep-skip"
              className="w-full mt-1.5 py-3 text-t13 text-gray-400">건너뛰기</button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <span className="text-[44px]">🙏</span>
            <p className="text-t19 font-bold text-gray-900 mt-3 mb-1">알려드릴게요.</p>
            <p className="text-t19 font-bold text-gray-900 mb-4">고생 많으셨어요.</p>
            {/* 마무리 안내 카드 슬롯 — 문안(원천징수·부가세·폐업신고 등) 도착 전까지 미노출 */}
            {reason === 'sold' && <CloseFlowDoneNotes axis={axis} />}
            <button onClick={finish} data-testid="close-flow-done"
              className="w-full mt-2 py-[16px] rounded-2xl text-t15 font-bold text-white"
              style={{ backgroundColor: cfg.color }}>
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
