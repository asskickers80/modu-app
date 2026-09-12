/**
 * 기업회원 한마디 관리 (ORDER 2026-09-12 파트 C2·C4) — /business/takes
 * [한마디 부탁하기] → 초대 링크 공유 / 대기함 [올리기]/[안 올리기] (MAX_APPROVED 까지, 순서 ▲▼) / 게시 [내리기]
 */
import { useEffect, useState } from 'react'
import useSafeBack from '../hooks/useSafeBack'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { supabase, getDeviceId } from '../lib/supabase'
import { shareLink } from '../lib/share'
import { createInvite, fetchActiveInvite, fetchMyTakes, approveTake, declineTake, removeTake, reorderTakes } from '../lib/vendorTakes'
import { approvedOrdered, pendingList, canApprove } from '../lib/vendorTakesRules'
import { TAKES, TAKES_COPY } from '../../config/vendorTakes'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'

export default function VendorTakesManagePage() {
  const safeBack = useSafeBack('/a7/business')
  const { toast, showToast } = useToast()
  const [invite, setInvite] = useState(null)
  const [takes, setTakes] = useState([])
  const [vendorId, setVendorId] = useState(null)
  const load = async () => { setInvite(await fetchActiveInvite()); setTakes(await fetchMyTakes()) }
  useEffect(() => {
    load()
    supabase.from('listings').select('id').eq('device_id', getDeviceId()).eq('listing_type', 'business').limit(1).then(({ data }) => setVendorId(data?.[0]?.id ?? null))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const approved = approvedOrdered(takes)
  const pending = pendingList(takes)

  const invite_ = async () => {
    const r = await createInvite(vendorId)
    if (!r.ok) { showToast(r.reason === 'login' ? '로그인이 필요해요' : '초대를 만들지 못했어요'); return }
    setInvite(r.invite)
    const res = await shareLink({ title: '함께 일한 사장님 한마디', text: '이 업체와 함께 일하셨다면 한마디 남겨 주세요', path: `/take/${r.invite.token}` })
    showToast(res === 'copied' ? '링크를 복사했어요' : res === 'shared' ? '보냈어요' : '링크가 준비됐어요')
  }
  const approve = async (t) => { const r = await approveTake(t, approved.length); if (r.ok) load(); else showToast(TAKES_COPY.approveMax.replace('{n}', String(TAKES.MAX_APPROVED))) }
  const move = async (idx, dir) => {
    const ids = approved.map(t => t.id); const j = idx + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    await reorderTakes(ids); load()
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-50">
        <button onClick={safeBack} aria-label="뒤로" className="w-11 h-11 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-t17 font-bold text-gray-900">{TAKES_COPY.sectionTitle}</h1>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'none' }}>
        <div className="rounded-2xl px-4 py-3.5" style={{ backgroundColor: PURPLE_BG }}>
          <p className="text-t13 text-gray-700">{TAKES_COPY.inviteNotice.replace('{hours}', String(TAKES.INVITE_HOURS)).replace('{max}', String(TAKES.MAX_RESPONSES))}</p>
          {invite ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-t12 text-gray-500 flex-1 truncate" data-testid="take-invite-active">활성 초대 · 답변 {invite.response_count}/{invite.max_responses}</span>
              <button type="button" onClick={() => shareLink({ title: '함께 일한 사장님 한마디', path: `/take/${invite.token}` }).then(r => showToast(r === 'copied' ? '링크를 복사했어요' : '보냈어요'))} data-testid="take-invite-share"
                className="px-3 py-2 rounded-xl text-t12 font-bold text-white" style={{ backgroundColor: PURPLE }}>다시 공유</button>
            </div>
          ) : (
            <button type="button" onClick={invite_} data-testid="take-invite-create" className="mt-2 w-full py-3 rounded-xl text-t14 font-bold text-white" style={{ backgroundColor: PURPLE }}>{TAKES_COPY.inviteButton}</button>
          )}
        </div>

        <p className="text-t14 font-bold text-gray-900 mt-6">올린 한마디 <span className="text-gray-400 font-normal">{approved.length}/{TAKES.MAX_APPROVED}</span></p>
        <div className="mt-2 flex flex-col gap-2" data-testid="takes-approved">
          {approved.map((t, i) => (
            <div key={t.id} className="rounded-2xl border border-gray-100 px-4 py-3" data-testid="take-approved">
              <p className="text-t13 font-bold text-gray-900">{t.display_name} <span className="text-t11 text-gray-500 font-normal">{t.business_type} · {t.chip}</span></p>
              {t.body && <p className="text-t13 text-gray-700 mt-0.5">{t.body}</p>}
              {t.voice_url && <audio controls preload="none" src={t.voice_url} className="mt-1 w-full" />}
              <div className="flex gap-1.5 mt-2">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-2.5 py-1.5 rounded-lg text-t12 bg-gray-100 disabled:opacity-30" aria-label="위로">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === approved.length - 1} className="px-2.5 py-1.5 rounded-lg text-t12 bg-gray-100 disabled:opacity-30" aria-label="아래로">▼</button>
                <button type="button" onClick={() => removeTake(t).then(load)} data-testid="take-remove" className="ml-auto px-3 py-1.5 rounded-lg text-t12 font-semibold text-gray-500 underline underline-offset-2">내리기</button>
              </div>
            </div>
          ))}
          {!approved.length && <p className="text-t13 text-gray-400">아직 올린 한마디가 없어요</p>}
        </div>

        <p className="text-t14 font-bold text-gray-900 mt-6">대기함 <span className="text-gray-400 font-normal">{pending.length}</span></p>
        {!canApprove(approved.length) && <p className="text-t12 mt-1" style={{ color: '#A65A0C' }} data-testid="take-approve-max">{TAKES_COPY.approveMax.replace('{n}', String(TAKES.MAX_APPROVED))}</p>}
        <div className="mt-2 flex flex-col gap-2" data-testid="takes-pending">
          {pending.map(t => (
            <div key={t.id} className="rounded-2xl border border-gray-100 px-4 py-3" data-testid="take-pending">
              <p className="text-t13 font-bold text-gray-900">{t.display_name} <span className="text-t11 text-gray-500 font-normal">{t.business_type} · {t.chip}</span></p>
              {t.body && <p className="text-t13 text-gray-700 mt-0.5">{t.body}</p>}
              {t.voice_url && <audio controls preload="none" src={t.voice_url} className="mt-1 w-full" />}
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => approve(t)} disabled={!canApprove(approved.length)} data-testid="take-approve" className="flex-1 py-2 rounded-xl text-t13 font-bold text-white disabled:opacity-40" style={{ backgroundColor: PURPLE }}>올리기</button>
                <button type="button" onClick={() => declineTake(t).then(load)} data-testid="take-decline" className="flex-1 py-2 rounded-xl text-t13 font-semibold bg-gray-100 text-gray-600">안 올리기</button>
              </div>
            </div>
          ))}
          {!pending.length && <p className="text-t13 text-gray-400">대기 중인 한마디가 없어요</p>}
        </div>
      </main>
      {toast && <Toast message={toast} />}
    </div>
  )
}
