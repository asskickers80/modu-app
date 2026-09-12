/**
 * 기업회원 상세 (/e2b/:id) — 이번 오더에서 신설(ORDER 2026-09-12 파트 A5·C4).
 * 업체명·소개·태그 + [문의하기]/[전화하기] + 후기 칸(회원 후기, 업체가 고르지 않음) + '함께 일한 사장님 한마디' 칸(업체 승인제).
 * 두 칸은 순서 고정(후기 위, 한마디 아래)이고 각각 고정 문안 1줄로 구분한다.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import useSafeBack from '../hooks/useSafeBack'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { supabase, getDeviceId } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import VendorContactButtons from '../components/VendorContactButtons'
import ReviewSection from '../components/ReviewSection'
import VendorTakesSection from '../components/VendorTakesSection'
import { REVIEW_COPY } from '../../config/reviews'
import ModuSpinner from '../components/ModuSpinner'

const PURPLE = '#7d4ba3'

export default function VendorDetailPage() {
  const { id } = useParams()
  const safeBack = useSafeBack('/explore')
  const { toast, showToast } = useToast()
  const { user } = useAuth()
  const [vendor, setVendor] = useState(undefined)

  useEffect(() => {
    supabase.from('listings').select('*').eq('id', id).eq('listing_type', 'business').maybeSingle()
      .then(({ data }) => setVendor(data ?? null)).catch(() => setVendor(null))
  }, [id])

  if (vendor === undefined) return <div className="h-screen flex items-center justify-center"><ModuSpinner size={56} /></div>
  if (!vendor) return <div className="h-screen flex flex-col items-center justify-center gap-2 px-8"><p className="text-t15 font-bold text-gray-700">업체를 찾지 못했어요</p><button onClick={safeBack} className="text-t13 underline" style={{ color: PURPLE }}>돌아가기</button></div>

  const isOwner = vendor.device_id === getDeviceId() || (!!user && vendor.user_id === user.id)
  const v = { id: vendor.id, name: vendor.shop_name ?? '업체', deviceId: vendor.device_id, phone: vendor.biz_phone ? String(vendor.biz_phone).trim() : null }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-50">
        <button onClick={safeBack} aria-label="뒤로" className="w-11 h-11 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-t17 font-bold text-gray-900 truncate flex-1" data-testid="vendor-name">{v.name}</h1>
        <span className="text-t10 font-bold px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: PURPLE }}>모두 입점</span>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'none' }}>
        {vendor.biz_tagline && <p className="text-t14 text-gray-700">{vendor.biz_tagline}</p>}
        {Array.isArray(vendor.biz_tags) && vendor.biz_tags.length > 0 && <p className="text-t12 mt-1" style={{ color: PURPLE }}>{vendor.biz_tags.map(t => `#${t}`).join(' ')}</p>}
        {vendor.address && <p className="text-t12 text-gray-400 mt-1">{String(vendor.address).split(/\s+/).slice(0, 3).join(' ')}</p>}
        {!isOwner && (
          <div className="mt-4"><VendorContactButtons vendor={v} source="vendor_profile" accent={PURPLE} showToast={showToast} /></div>
        )}
        {/* 후기 칸 — 모두 회원이 남긴 후기, 업체가 고르지 않는다 (파트 A5). 기업회원 본인은 [이의신청]만 */}
        <ReviewSection targetType="vendor" targetId={vendor.id} user={user} role={isOwner ? 'vendor_owner' : 'visitor'} showToast={showToast} accent={PURPLE} foot={REVIEW_COPY.vendorReviewFoot} />
        {/* 한마디 칸 — 업체가 초대한 분들이 남긴 말, 업체가 골라서 올린다 (파트 C4). 항상 후기 아래 */}
        <VendorTakesSection vendor={vendor} isOwner={isOwner} user={user} showToast={showToast} />
      </main>
      {toast && <Toast message={toast} />}
    </div>
  )
}
