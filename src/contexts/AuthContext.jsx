import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

/** 어느 컴포넌트에서든 useAuth()로 로그인 상태를 꺼냅니다 */
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  // undefined = 세션 확인 중, null = 로그아웃, object = 로그인됨
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    // 앱 시작 시 기존 세션 복원
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // 로그인/로그아웃 이벤트 감지 → 자동 갱신
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    // 로컬 완전 초기화 — 로그아웃 후 잔재가 다음 온보딩·로그인과 섞이지 않도록.
    // 계정 데이터는 서버(profiles·user_metadata)에 있으므로 재로그인 시 그대로 복원된다.
    localStorage.removeItem('modu_device_id')
    localStorage.removeItem('modu_user_profile')
    localStorage.removeItem('modu_profiles')
    localStorage.removeItem('modu_pending_roles')
    localStorage.removeItem('modu_pending_category')
    localStorage.removeItem('modu_onboarding_answers')
    localStorage.removeItem('modu_auth_intent')
  }

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
