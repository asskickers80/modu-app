import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveProfile, getProfile } from '../lib/userProfile'

const KAKAO_REST_KEY = '5e06205586b30fa239b852a5f41c754c'
const KAKAO_CLIENT_SECRET = 'aEOqh5Wv1dyIvdbBFy6EacFSFPCNpFd2'
const NAVY = '#1a4d8f'

const DEST_MAP = {
  seller:    '/a7/seller',
  landlord:  '/a7/landlord',
  startup:   '/a7/startup',
  operating: '/a7/operating',
  business:  '/a7/business',
  browsing:  '/a7/browsing',
}

export default function AuthKakaoCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) {
      setError('인증 코드가 없습니다.')
      return
    }
    // 같은 코드를 두 번 사용하지 않도록 방지 (React Strict Mode 이중 실행 대응)
    if (sessionStorage.getItem('kakao_code_used') === code) return
    sessionStorage.setItem('kakao_code_used', code)
    handleKakaoCallback(code)
  }, [])

  async function handleKakaoCallback(code) {
    try {
      const redirectUri = `${window.location.origin}/auth/kakao-callback`

      // 1. 카카오 access token 교환
      const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: KAKAO_REST_KEY,
          client_secret: KAKAO_CLIENT_SECRET,
          redirect_uri: redirectUri,
          code,
        }),
      })
      const tokenData = await tokenRes.json()

      if (!tokenData.access_token) {
        setError('카카오 토큰 오류: ' + (tokenData.error_description ?? JSON.stringify(tokenData)))
        return
      }

      // 2. 카카오 프로필 조회
      const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const kakaoUser = await profileRes.json()

      const kakaoId = String(kakaoUser.id)
      const nickname = kakaoUser.kakao_account?.profile?.nickname
        ?? kakaoUser.properties?.nickname
        ?? null

      // 3. Supabase 로그인 (카카오 ID 기반)
      const email = `kakao_${kakaoId}@kakao.modu.internal`
      const password = `modu_${kakaoId}_kakao`

      let userId = null

      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password })

      if (signInData?.user) {
        userId = signInData.user.id
      } else {
        // 신규 사용자 — 가입
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { kakao_id: kakaoId, full_name: nickname } },
        })
        if (signUpError) {
          setError('계정 생성 실패: ' + signUpError.message)
          return
        }
        userId = signUpData.user.id
      }

      // 4. profiles 테이블 처리
      const cat = localStorage.getItem('modu_pending_category')
      localStorage.removeItem('modu_pending_category')

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('category, nickname, profile_data')
        .eq('id', userId)
        .maybeSingle()

      if (existingProfile) {
        // 기존 유저 — DB에서 복원
        const restored = {
          ...(existingProfile.profile_data || {}),
          name: existingProfile.nickname ?? nickname,
          category: existingProfile.category,
        }
        saveProfile(restored)
        navigate(DEST_MAP[existingProfile.category] ?? '/a2', { replace: true })
      } else {
        // 신규 유저 — 프로필 생성
        const localProfile = getProfile()
        const profileData = { ...localProfile }
        delete profileData.name

        await supabase.from('profiles').insert({
          id: userId,
          category: cat,
          nickname,
          profile_data: profileData,
        })
        saveProfile({ ...localProfile, name: nickname, category: cat })
        navigate(DEST_MAP[cat] ?? '/a7/seller', { replace: true })
      }
    } catch (e) {
      setError('오류: ' + e.message)
    }
  }

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
