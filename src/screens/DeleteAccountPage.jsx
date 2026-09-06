/**
 * 계정 삭제 (ORDER-key-proxy-account-deletion B-3)
 *
 * 원칙: 무엇이 사라지고 무엇이 남는지 그대로 적는다. 붙잡는 문구를 넣지 않는다.
 * 실제 파기는 서버(Edge Function delete-account)가 한다 — 카카오 식별자가 Auth 계정
 * 이메일에 있어 클라이언트로는 파기할 수 없기 때문이다.
 * 삭제 성공 후 로컬 세션·저장소를 비우고 첫 화면으로 보낸다.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSafeBack from '../hooks/useSafeBack'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { requestAccountDeletion } from '../lib/apiProxy'

const RED = '#ef4444'

// 사실만 — 각 항목은 실제 삭제 동작과 1:1로 대응한다
const GONE = [
  '이름과 프로필, 카카오·네이버 연결',
  '등록한 매물과 상가 (목록·탐색에서 사라져요)',
  '매출 기록과 고정비의 계정 연결',
  '알림과 이번 주 한 줄',
]
const STAYS = [
  '주고받은 대화 — 상대방 화면에서 사라지지 않게 내용은 남고, 이름만 "탈퇴한 사용자"로 바뀌어요',
  '거래 통계 — 어떤 업종이 어느 지역에서 거래됐는지만 남고, 누구인지는 남지 않아요',
]

export default function DeleteAccountPage() {
  const navigate = useNavigate()
  const safeBack = useSafeBack('/my')
  const { toast, showToast } = useToast()
  const { signOut } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const runDelete = async () => {
    if (busy) return
    setBusy(true)
    const r = await requestAccountDeletion()
    if (!r.ok) {
      setBusy(false)
      // 무엇이 안 됐는지 그대로 — 재시도 가능 여부까지 알린다
      showToast(r.retryable
        ? '일부만 처리됐어요. 다시 눌러주시면 이어서 지워요.'
        : '삭제하지 못했어요. 잠시 후 다시 시도해주세요.')
      return
    }
    // 로컬 흔적 제거 후 첫 화면으로 (signOut이 앱 로컬 저장소를 비운다)
    try { await signOut() } catch (_) { /* 서버 계정은 이미 사라졌다 */ }
    navigate('/', { replace: true })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-50">
        <button onClick={safeBack} aria-label="뒤로" className="w-11 h-11 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 4l-6 6 6 6" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-t17 font-bold text-gray-900">계정 삭제</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6" style={{ scrollbarWidth: 'none' }}>
        <p className="text-t16 font-bold text-gray-900 leading-snug mb-1">
          계정을 삭제하면 되돌릴 수 없어요.
        </p>
        <p className="text-t13 text-gray-500 mb-6">지우기 전에 무엇이 사라지는지 확인해 주세요.</p>

        <section className="mb-6" data-testid="delete-gone">
          <p className="text-t13 font-bold mb-2" style={{ color: RED }}>사라지는 것</p>
          <ul className="flex flex-col gap-2">
            {GONE.map(t => (
              <li key={t} className="flex gap-2 text-t14 text-gray-700 leading-relaxed">
                <span className="shrink-0" style={{ color: RED }}>·</span>{t}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8" data-testid="delete-stays">
          <p className="text-t13 font-bold text-gray-500 mb-2">남는 것</p>
          <ul className="flex flex-col gap-2">
            {STAYS.map(t => (
              <li key={t} className="flex gap-2 text-t14 text-gray-600 leading-relaxed">
                <span className="shrink-0 text-gray-400">·</span>{t}
              </li>
            ))}
          </ul>
        </section>

        {!confirming ? (
          <button onClick={() => setConfirming(true)} data-testid="delete-account-start"
            className="w-full py-[16px] rounded-2xl text-t15 font-bold border-2 bg-white"
            style={{ borderColor: RED, color: RED }}>
            계정 삭제하기
          </button>
        ) : (
          <div data-testid="delete-account-confirm">
            <p className="text-t14 font-bold text-gray-900 mb-3">정말 삭제할까요?</p>
            <button onClick={runDelete} disabled={busy} data-testid="delete-account-final"
              className="w-full py-[16px] rounded-2xl text-t15 font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: RED }}>
              {busy ? '삭제하는 중…' : '네, 삭제할게요'}
            </button>
            <button onClick={() => setConfirming(false)} disabled={busy}
              className="w-full mt-2 py-3 rounded-2xl text-t14 font-medium text-gray-400">
              그만둘게요
            </button>
          </div>
        )}
      </main>

      <Toast message={toast} />
    </div>
  )
}
