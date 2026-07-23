import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1p } from './E1pContext'
import { saveListing } from '../../lib/listings'
import { getProfile } from '../../lib/userProfile'
import { computeCapRate } from '../../lib/format'

// E1p 데이터 → listings 임대인 payload (재사용 컬럼 + landlord 신설 컬럼)
const DEAL_MAP = { rent: 'lease', sale: 'sale', both: 'both' }
function landlordPayload(data) {
  return {
    listing_type: 'landlord',
    deal_type: DEAL_MAP[data.listingType] ?? null,
    address: [data.address, data.detailAddress].filter(Boolean).join(' ') || null,
    address_detail: data.detailAddress || null,
    floor: data.floor || null,
    area: data.area || null,
    deposit: data.deposit || null,
    monthly_rent: data.monthlyRent || null,
    maintenance: data.maintenance || null,
    sale_price: data.salePrice || null,
    // 수익률 자동 계산(연 월세÷매매가) — occupancy로 현/예상 라벨 구분. 매매가 없으면 null.
    cap_rate: computeCapRate(data.monthlyRent, data.salePrice) ?? null,
    occupancy: data.occupancy ?? null, // 임차 현황(공실/현임차인) — 홈 공실 집계·수익률 라벨
    recommended_biz: data.recommendedBiz ?? [],
    ai_draft: data.aiDraft ?? {},
    review_choices: data.reviewChoices ?? {},
    edited_texts: data.editedTexts ?? {},
    image_urls: [],
    owner_nickname: getProfile().name ?? null,
  }
}

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'
const GREEN = '#22c55e'
const AMBER = '#d68b2a'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: TEAL }} />
      ))}
    </div>
  )
}

function calcScore(data) {
  let s = 0
  if (data.address) s += 20
  if (data.floor && data.area) s += 10
  if (data.listingType === 'rent' || data.listingType === 'both') {
    if (data.deposit && data.monthlyRent) s += 15
  }
  if (data.listingType === 'sale' || data.listingType === 'both') {
    if (data.salePrice) s += 15
  }
  if (Object.keys(data.reviewChoices || {}).length >= 3) s += 15
  s += 12  // 도면 더미
  if (data.registryDone) s += 8
  return Math.min(s, 100)
}

function AuthGateModal({ onConfirm, onCancel }) {
  const [step, setStep] = useState('gate')

  const handleAuth = () => {
    setStep('verifying')
    setTimeout(() => setStep('success'), 1500)
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-3xl mx-5 p-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#dcfce7' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 16l8 8 12-14" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-[20px] font-bold text-gray-900 mb-2">상가가 공개됐어요!</h3>
          <p className="text-[14px] text-gray-500 mb-6">임차·매수 희망자들이 내 상가를 볼 수 있어요</p>
          <button onClick={onConfirm}
            className="w-full py-[16px] rounded-2xl text-[16px] font-bold text-white"
            style={{ backgroundColor: TEAL }}>
            대시보드로 이동
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full max-w-[390px] rounded-t-3xl px-5 pt-6 pb-10">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: TEAL_BG }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke={TEAL} strokeWidth="1.6" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-gray-900">본인인증이 필요해요</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">상가 공개 전 1회만 진행해요</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 px-4 py-3 mb-5">
          <p className="text-[13px] text-gray-600 leading-relaxed">
            이 인증은 <strong>상가 공개, 연락처 교환</strong> 시 단 한 번만 요청돼요. 이후엔 자동으로 통과해요.
          </p>
        </div>
        {step === 'verifying' ? (
          <div className="flex items-center justify-center gap-3 py-[18px] rounded-2xl border border-gray-100">
            <div className="w-5 h-5 border-2 rounded-full border-t-transparent animate-spin"
              style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }} />
            <span className="text-[15px] font-semibold text-gray-500">인증 처리 중...</span>
          </div>
        ) : (
          <button onClick={handleAuth}
            className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: TEAL }}>
            휴대폰 본인인증 (더미)
          </button>
        )}
        <button onClick={onCancel} className="w-full py-3 mt-2 text-[14px] text-gray-400">
          취소
        </button>
      </div>
    </div>
  )
}

export default function E1pStep5() {
  const navigate = useNavigate()
  const { data } = useE1p()
  const [showGate, setShowGate] = useState(false)

  const score = calcScore(data)
  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'

  const CHECKLIST = [
    { id: 'addr', label: '주소 입력', done: !!data.address },
    { id: 'area', label: '층수·면적', done: !!(data.floor && data.area) },
    { id: 'cond', label: isRent ? '임대 조건' : '매매가', done: isRent ? !!(data.deposit && data.monthlyRent) : !!data.salePrice },
    { id: 'review', label: '소개글 검수', done: Object.keys(data.reviewChoices || {}).length >= 3 },
    { id: 'floor_plan', label: '도면 사진', done: true, impact: '문의 ↑↑↑' },  // 더미
    { id: 'registry', label: '등기부등본 (예정)', done: true },
    { id: 'exterior', label: '외관 사진', done: false, impact: '신뢰도 ↑' },
    { id: 'extra', label: '추가 서류', done: (data.extras || []).length > 0, impact: '신뢰도 ↑↑' },
  ]

  const missing = CHECKLIST.filter(c => !c.done && c.impact)

  // 자산 카드 미리보기
  const addr = data.address || '서울 마포구 서교동 332-4'
  const shortAddr = addr.split(' ').slice(2).join(' ')

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1p/4')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">상가 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: TEAL }}>5 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">자산 카드를 확인해요</h2>
          <p className="text-[13px] text-gray-400 mt-1">공개되면 이렇게 보여요. 지금 공개하거나 나중에 할 수 있어요</p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* 자산 카드 미리보기 */}
        <div className="mt-5 mb-6">
          <p className="text-[13px] font-bold text-gray-500 mb-3">공개 시 카드 미리보기</p>
          <div className="rounded-3xl border-2 overflow-hidden"
            style={{ borderColor: TEAL, background: 'linear-gradient(135deg, #f7fdfd 0%, #eef6f6 100%)' }}>
            {/* 카드 상단 - 더미 이미지 */}
            <div className="h-32 flex items-center justify-center relative"
              style={{ backgroundColor: '#d0e8e8' }}>
              <span className="text-[40px]">🏢</span>
              <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                {isRent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90"
                    style={{ color: TEAL }}>임대</span>
                )}
                {isSale && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90"
                    style={{ color: '#b07000' }}>매각</span>
                )}
              </div>
            </div>
            {/* 카드 내용 */}
            <div className="px-4 py-4">
              <p className="text-[15px] font-bold text-gray-900 mb-1">{shortAddr} 상가</p>
              <p className="text-[12px] text-gray-500 mb-3">
                {data.floor || '1층'} · {data.area || '45'}㎡ · 홍대입구역 도보 4분
              </p>
              <div className="flex gap-3">
                {isRent && data.deposit && (
                  <div>
                    <p className="text-[10px] text-gray-400">보증금</p>
                    <p className="text-[15px] font-bold" style={{ color: TEAL }}>
                      {Number(data.deposit).toLocaleString()}만
                    </p>
                  </div>
                )}
                {isRent && data.monthlyRent && (
                  <div>
                    <p className="text-[10px] text-gray-400">월세</p>
                    <p className="text-[15px] font-bold" style={{ color: TEAL }}>
                      {Number(data.monthlyRent).toLocaleString()}만
                    </p>
                  </div>
                )}
                {isSale && data.salePrice && (
                  <div>
                    <p className="text-[10px] text-gray-400">매매가</p>
                    <p className="text-[15px] font-bold" style={{ color: '#b07000' }}>
                      {Number(data.salePrice).toLocaleString()}만
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: TEAL }} />
                </div>
                <span className="text-[11px] font-bold" style={{ color: TEAL }}>완성도 {score}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 입력 현황 */}
        <div className="mb-5">
          <p className="text-[13px] font-bold text-gray-700 mb-3">입력 현황</p>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            {CHECKLIST.map((item, i) => (
              <div key={item.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < CHECKLIST.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: item.done ? GREEN : '#e5e7eb' }}>
                  {item.done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`text-[13px] flex-1 ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>
                  {item.label}
                </span>
                {item.impact && !item.done && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#fef3e2', color: AMBER }}>
                    {item.impact}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 더 채우면 */}
        {missing.length > 0 && (
          <div className="mb-5">
            <p className="text-[13px] font-bold text-gray-700 mb-3">더 채우면 좋아요</p>
            <div className="flex flex-col gap-2">
              {missing.map(item => (
                <div key={item.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />
                  <span className="text-[13px] text-gray-600 flex-1">{item.label}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#fef3e2', color: AMBER }}>
                    {item.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-4 rounded-2xl" style={{ backgroundColor: TEAL_BG }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: TEAL }}>지금 공개해도 괜찮아요</p>
          <ul className="space-y-1">
            {['기본 팩트 + 모두 초안 = 충분한 정보', '공개 후에도 도면·사진 추가 가능', '등기 자동열람으로 신뢰도 기본 확보 (예정)'].map(t => (
              <li key={t} className="flex items-start gap-1.5 text-[12px] text-gray-600">
                <span style={{ color: TEAL }}>✓</span>{t}
              </li>
            ))}
          </ul>
        </div>

      </main>

      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          onClick={() => setShowGate(true)}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white transition-all active:scale-[0.99]"
          style={{ backgroundColor: TEAL }}>
          상가 공개하기
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-2">
          공개 전 본인인증 1회 필요 · 언제든 비공개 전환 가능
        </p>
      </div>

      {showGate && (
        <AuthGateModal
          onConfirm={async () => {
            // 본인인증(더미) 통과 = 공개 → listings 저장(landlord). 실패해도 대시보드 이동(스키마 SQL 실행 후 정상).
            try { await saveListing({ payload: landlordPayload(data), editingListingId: data.editingListingId, isDemo: data.isDemo }) } catch (_) {}
            navigate('/a7/landlord')
          }}
          onCancel={() => setShowGate(false)} />
      )}
    </div>
  )
}
