import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const NAVY = '#1a4d8f'

export default function AuthResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady]       = useState(false) // PASSWORD_RECOVERY 이벤트 수신 여부
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    // Supabase가 URL fragment에서 세션을 복구하면 PASSWORD_RECOVERY 이벤트가 온다
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // 이미 세션이 있는 경우도 대비 (새로고침 등)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 해요'); return }
    if (password !== confirm) { setError('비밀번호가 일치하지 않아요'); return }
    setLoading(true); setError(null)
    const { error: e } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (e) { setError(e.message); return }
    setDone(true)
    setTimeout(() => navigate('/a4', { replace: true }), 2500)
  }

  if (done) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white px-8">
        <span className="text-[48px]">✅</span>
        <p className="text-[18px] font-bold text-gray-900 text-center">비밀번호가 변경됐어요</p>
        <p className="text-[13px] text-gray-400 text-center">새 비밀번호로 로그인해 주세요</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <div className="w-10 h-10 border-[3px] border-gray-100 rounded-full animate-spin"
          style={{ borderTopColor: NAVY }} />
        <p className="text-[14px] text-gray-500">링크를 확인하는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-20 pb-8">
      <h1 className="text-[24px] font-bold text-gray-900 mb-2">새 비밀번호 설정</h1>
      <p className="text-[14px] text-gray-400 mb-8">6자 이상으로 설정해 주세요</p>
      <div className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="새 비밀번호"
          autoComplete="new-password"
          className="w-full px-4 py-[14px] rounded-2xl border border-gray-200 text-[14px] outline-none focus:border-gray-400"
        />
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="비밀번호 확인"
          autoComplete="new-password"
          className="w-full px-4 py-[14px] rounded-2xl border border-gray-200 text-[14px] outline-none focus:border-gray-400"
        />
        {error && <p className="text-[13px] text-red-500 px-1">{error}</p>}
        <button
          onClick={handleReset}
          disabled={!password || !confirm || loading}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 transition-all"
          style={{ backgroundColor: NAVY }}
        >
          {loading ? '처리 중...' : '비밀번호 변경하기'}
        </button>
      </div>
    </div>
  )
}
