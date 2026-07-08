import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveProfile, getProfile } from '../lib/userProfile'

const NAVY = '#1a4d8f'

const DEST_MAP = {
  seller:    '/a7/seller',
  landlord:  '/a7/landlord',
  startup:   '/a7/startup',
  operating: '/a7/operating',
  business:  '/a7/business',
  browsing:  '/a7/browsing',
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    let handled = false

    async function handleSession(session) {
      if (handled) return
      handled = true

      // 카카오 닉네임: user_metadata.full_name (profile_nickname scope)
      const nickname = session.user.user_metadata?.full_name
        ?? session.user.user_metadata?.name
        ?? null

      // 1. 이미 프로필 있는 기존 유저인지 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('category, nickname, profile_data')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile) {
        // 기존 유저 → DB에서 프로필 복원 (닉네임 + A3 답변 등)
        const restored = {
          ...(profile.profile_data || {}),
          name: profile.nickname ?? nickname,
          category: profile.category,
        }
        saveProfile(restored)
        // DB 닉네임이 없으면 이번 세션 닉네임으로 업데이트
        if (!profile.nickname && nickname) {
          await supabase.from('profiles').update({ nickname }).eq('id', session.user.id)
        }
        navigate(DEST_MAP[profile.category] ?? '/a2', { replace: true })
        return
      }

      // 2. 신규 유저 — 온보딩에서 선택한 카테고리가 있으면 프로필 생성
      const cat = localStorage.getItem('modu_pending_category')
      localStorage.removeItem('modu_pending_category')

      if (cat) {
        // A3에서 입력한 값들이 localStorage에 있음 — DB에 통째로 저장
        const localProfile = getProfile()
        const profileData = { ...localProfile }
        delete profileData.name // nickname 컬럼에 별도 저장

        await supabase.from('profiles').insert({
          id: session.user.id,
          category: cat,
          nickname,
          profile_data: profileData,
        })
        saveProfile({ ...localProfile, name: nickname, category: cat })
        navigate(DEST_MAP[cat] ?? '/a7/seller', { replace: true })
      } else {
        // 카테고리 없음 → 온보딩부터 다시
        navigate('/a2', { replace: true })
      }
    }

    // 이미 세션이 있으면 즉시 처리 (새로고침·재방문 등)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session)
    })

    // PKCE 코드 교환 후 SIGNED_IN 이벤트 대기
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) handleSession(session)
    })

    // 15초 넘으면 오류 표시
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
      <p className="text-[15px] font-bold text-gray-900">카카오 로그인 처리 중...</p>
      <p className="text-[12px] text-gray-400">잠시만 기다려 주세요</p>
    </div>
  )
}
