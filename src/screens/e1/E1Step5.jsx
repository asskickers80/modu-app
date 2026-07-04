import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1, clearE1Draft } from './E1Context'
import { supabase, getDeviceId } from '../../lib/supabase'
import { calcScore } from '../../lib/completeness'
import { getProfile } from '../../lib/userProfile'
import ModuSpinner from '../../components/ModuSpinner'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const GREEN = '#22c55e'
const AMBER = '#d68b2a'

function ProgressBar({ step }) {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= step ? NAVY : '#e5e7eb' }} />
      ))}
    </div>
  )
}


// 실입력 기반 체크리스트 — calcScore(lib/completeness.js)와 동일한 data 필드를 판정에 사용
function buildChecklist(data) {
  return [
    { id: 'address',  label: '주소 입력',      impact: null,            done: !!data.address },
    { id: 'shop',     label: '상호·층·면적',   impact: null,            done: !!data.shopName && !!data.floor && !!data.area },
    { id: 'lease',    label: '임대 조건',      impact: null,            done: !!data.deposit && !!data.monthlyRent },
    { id: 'fee',      label: '희망 권리금',    impact: null,            done: !!data.transferFee },
    { id: 'review',   label: 'AI 초안 검수',   impact: null,            done: Object.keys(data.reviewChoices || {}).length >= 3 },
    { id: 'interior', label: '내부 사진 3장',  impact: '노출 순위 ↑↑',  done: (data.interiorPhotos?.length ?? 0) >= 3 },
    { id: 'exterior', label: '외부 사진',      impact: '신뢰도 ↑',      done: (data.exteriorPhotos?.length ?? 0) > 0 },
    { id: 'proof',    label: '매출 증빙 연동', impact: '신뢰도 ↑↑',     done: !!data.salesProof },
    { id: 'facility', label: '시설·집기 목록', impact: '검색 정확도 ↑', done: (data.facilities?.length ?? 0) > 0 },
  ]
}

// 공개 인증 게이트 모달
function AuthGateModal({ onSave, onConfirm, onCancel, isEdit }) {
  const [step, setStep] = useState('gate') // 'gate' | 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const isSubmitting = useRef(false)       // 이중 제출 방어 — 동기 클릭도 차단
  const [submitting, setSubmitting] = useState(false) // 버튼 disabled 상태

  const handleAuth = async () => {
    if (isSubmitting.current) return       // 이미 진행 중이면 즉시 차단
    isSubmitting.current = true
    setSubmitting(true)                    // 버튼 disabled 처리
    setStep('verifying')
    try {
      await onSave()
      setStep('success')
    } catch (e) {
      setErrorMsg(e.message ?? '저장 중 오류가 발생했어요')
      setStep('error')
      isSubmitting.current = false         // 에러 시 재시도 허용
      setSubmitting(false)
    }
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
          <h3 className="text-[20px] font-bold text-gray-900 mb-2">
            {isEdit ? '매물이 수정됐어요!' : '매물이 공개됐어요!'}
          </h3>
          <p className="text-[14px] text-gray-500 mb-6">
            {isEdit ? '변경 내용이 바로 반영됐어요' : '이제 양수자들이 내 매물을 볼 수 있어요'}
          </p>
          <button onClick={onConfirm} className="w-full py-[16px] rounded-2xl text-[16px] font-bold text-white"
            style={{ backgroundColor: NAVY }}>
            대시보드로 이동
          </button>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-3xl mx-5 p-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#fee2e2' }}>
            <span style={{ fontSize: '28px' }}>❌</span>
          </div>
          <h3 className="text-[18px] font-bold text-gray-900 mb-2">저장 실패</h3>
          <p className="text-[13px] text-red-500 mb-6 break-all">{errorMsg}</p>
          <button onClick={() => setStep('gate')} className="w-full py-[16px] rounded-2xl text-[16px] font-bold text-white"
            style={{ backgroundColor: NAVY }}>
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full max-w-[390px] rounded-t-3xl px-5 pt-6 pb-10">
        {/* 핸들 */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: NAVY_BG }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke={NAVY} strokeWidth="1.6" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-gray-900">본인인증이 필요해요</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">매물 공개 전 1회만 진행해요</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 px-4 py-3 mb-5">
          <p className="text-[13px] text-gray-600 leading-relaxed">
            이 인증은 <strong>매물 공개, 연락처 교환, 민감 정보 연동</strong> 시 단 한 번만 요청돼요.
            이후엔 자동으로 통과해요.
          </p>
        </div>

        {step === 'verifying' ? (
          <div className="flex items-center justify-center gap-3 py-[18px] rounded-2xl border border-gray-100">
            <ModuSpinner size={28} />
            <span className="text-[15px] font-semibold text-gray-500">인증 처리 중...</span>
          </div>
        ) : (
          <button
            disabled={submitting}
            onClick={handleAuth}
            className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: submitting ? '#9ca3af' : NAVY }}>
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

export default function E1Step5() {
  const navigate = useNavigate()
  const { data, update } = useE1()
  const [showGate, setShowGate] = useState(false)
  const isEdit = !!data.editingListingId

  if (!data.aiDraft) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 gap-5 text-center">
        <div className="text-[40px]">🏠</div>
        <p className="text-[17px] font-bold text-gray-900">아직 매물 작성이 완료되지 않았어요</p>
        <p className="text-[14px] text-gray-500 leading-relaxed">
          1단계부터 순서대로 작성해야<br />매물을 공개할 수 있어요
        </p>
        <button onClick={() => navigate('/e1/1')}
          className="w-full max-w-xs py-4 rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: NAVY }}>
          처음부터 시작
        </button>
      </div>
    )
  }

  const saveListing = async () => {
    const payload = {
      address:        [data.address, data.detailAddress].filter(Boolean).join(' '),
      address_detail: data.detailAddress || null,
      shop_name:      data.shopName,
      floor:          data.floor,
      area:           data.area,
      deposit:        data.deposit,
      monthly_rent:   data.monthlyRent,
      maintenance:    data.maintenance,
      transfer_fee:   data.transferFee,
      transfer_type:  data.transferType,
      monthly_sales:  data.monthlySales,
      ai_draft:       data.aiDraft,
      review_choices: data.reviewChoices,
      edited_texts:   data.editedTexts,
      photos_added:   data.photosAdded,
      image_urls:     [
        ...(data.interiorPhotos || []),
        ...(data.exteriorPhotos || []),
      ].map(p => p.url),
      interior_image_urls: (data.interiorPhotos || []).map(p => p.url),
      exterior_image_urls: (data.exteriorPhotos || []).map(p => p.url),
      sales_proof:    data.salesProof,
      facilities:     data.facilities ?? [],
      // 저장 시점의 주인 닉네임 스냅샷 — DM receiver_name에 사용 (수정 재저장 시 자동 갱신)
      owner_nickname: getProfile().name ?? null,
    }
    // 수정 모드면 UPDATE (소유권·공개상태는 유지), 신규면 INSERT
    const { error } = data.editingListingId
      ? await supabase.from('listings').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', data.editingListingId)
      : await supabase.from('listings').insert({
          ...payload,
          device_id: getDeviceId(),
          // 예시✦ 채움 그대로 제출한 연습 등록은 마켓에 노출하지 않는다
          status: data.isDemo ? 'example' : 'published',
        })
    if (error) throw new Error(error.message)
    clearE1Draft() // 제출 성공 — 임시저장 초안 삭제
  }

  const score = calcScore(data)
  const checklist = buildChecklist(data)
  const doneItems = checklist.filter(c => c.done)
  const missing = checklist.filter(c => !c.done)

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1/4')} className="flex items-center gap-0.5 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">
            {isEdit ? '매물 수정' : '매물 등록'}
          </h1>
          <span className="text-[13px] font-bold" style={{ color: NAVY }}>5 / 5</span>
        </div>
        <ProgressBar step={5} />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">매물 완성도를 확인해요</h2>
          <p className="text-[13px] text-gray-400 mt-1">지금 바로 공개하거나, 더 채운 뒤 공개할 수 있어요</p>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* ─── 완성도 게이지 ─── */}
        <div className="mt-6 px-5 py-6 rounded-3xl border border-gray-100 text-center"
          style={{ background: 'linear-gradient(135deg, #f7f9ff 0%, #eef2fb 100%)' }}>
          {/* 원형 게이지 */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg width="128" height="128" viewBox="0 0 128 128">
              {/* 배경 원 */}
              <circle cx="64" cy="64" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              {/* 진행 원 */}
              <circle cx="64" cy="64" r="54" fill="none" stroke={NAVY} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - score / 100)}`}
                transform="rotate(-90 64 64)" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[32px] font-black" style={{ color: NAVY }}>{score}%</span>
              <span className="text-[11px] text-gray-400 font-medium">완성도</span>
            </div>
          </div>

          <p className="text-[15px] font-bold text-gray-900">
            {score >= 80 ? '매물이 거의 완성됐어요!' : score >= 60 ? '기본 정보는 충분해요' : '기본 정보를 더 채워봐요'}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {score >= 80 ? '지금 공개해도 좋아요' : '더 채울수록 노출이 올라가요'}
          </p>
        </div>

        {/* ─── 체크리스트 ─── */}
        <div className="mt-6">
          <p className="text-[13px] font-bold text-gray-700 mb-3">입력 현황</p>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            {checklist.map((item, i) => (
              <div key={item.id}
                data-testid={`check-${item.id}`} data-done={item.done}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < checklist.length - 1 ? 'border-b border-gray-50' : ''}`}>
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

        {/* ─── 더 채우면 ─── */}
        {missing.length > 0 && (
          <div className="mt-5">
            <p className="text-[13px] font-bold text-gray-700 mb-3">더 채우면 좋아요</p>
            <div className="flex flex-col gap-2">
              {missing.map(item => (
                <div key={item.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />
                  <span className="text-[13px] text-gray-600 flex-1">{item.label}</span>
                  {item.impact && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: '#fef3e2', color: AMBER }}>
                      {item.impact}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 지금 공개해도 되는 이유 ─── */}
        <div className="mt-5 px-4 py-4 rounded-2xl" style={{ backgroundColor: NAVY_BG }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: NAVY }}>지금 공개해도 괜찮아요</p>
          <ul className="space-y-1">
            {[
              '기본 팩트 + AI 초안 = 충분한 정보',
              '공개 후에도 사진·증빙 추가 가능',
              '완성도 높이면 노출 순위 자동 상승',
            ].map(t => (
              <li key={t} className="flex items-start gap-1.5 text-[12px] text-gray-600">
                <span style={{ color: NAVY }}>✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* 노출 3층 안내 */}
        <div className="mt-4 px-4 py-3 rounded-2xl border border-gray-100">
          <p className="text-[12px] text-gray-500 leading-relaxed">
            📢 지금은 <strong>무료 노출(1층)</strong>로 공개돼요.<br />
            프리미엄 전환 시 차별화 설명·노출 강화·매칭 우선순위가 올라가요.
          </p>
        </div>

      </main>

      {/* 하단 버튼 */}
      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          onClick={() => setShowGate(true)}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white transition-all active:scale-[0.99]"
          style={{ backgroundColor: NAVY }}>
          {isEdit ? '수정 완료하기' : '매물 공개하기'}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-2">
          공개 전 본인인증 1회 필요 · 언제든 비공개 전환 가능
        </p>
      </div>

      {/* 인증 게이트 모달 */}
      {showGate && (
        <AuthGateModal
          isEdit={isEdit}
          onSave={saveListing}
          onConfirm={() => {
            update({ editingListingId: null }) // 수정 세션 종료
            navigate('/a7/seller')
          }}
          onCancel={() => setShowGate(false)}
        />
      )}

    </div>
  )
}
