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

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
