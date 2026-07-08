import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { finishLogin } from '../lib/auth'

const NAVY = '#1a4d8f'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    let handled = false

    async function handleSession(session) {
      if (handled) return
      handled = true
      try {
        const nickname = session.user.user_metadata?.full_name
          ?? session.user.user_metadata?.name
          ?? null
        // provider는 Supabase Magic Link = 'email'
        await finishLogin({
          user: session.user,
          navigate,
          category: null,
          extraProfileFields: {
            nickname,
            provider: session.user.app_metadata?.provider ?? 'email',
          },
        })
      } catch (e) {
        setError('로그인 처리 중 오류가 발생했어요: ' + e.message)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) handleSession(session)
    })

    const timer = setTimeout(() => {
      if (!handled) setError('로그인 처리 시간이 초과됐어요.')
    }, 15000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [navigate])

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white px-8">
        <span className="text-[40px]">😅</span>
        <p className="text-[15px] font-bold text-gray-700 text-center">{error}</p>
        <button
          onClick={() => navigate('/a4', { replace: true })}
          className="mt-2 px-6 py-3 rounded-2xl text-[14px] font-bold text-white"
          style={{ backgroundColor: NAVY }}>
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <div
        className="w-10 h-10 border-[3px] border-gray-100 rounded-full animate-spin"
        style={{ borderTopColor: NAVY }}
      />
      <p className="text-[15px] font-bold text-gray-900">로그인 처리 중...</p>
      <p className="text-[12px] text-gray-400">잠시만 기다려 주세요</p>
    </div>
  )
}
