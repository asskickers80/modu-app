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
    // 계정 기준 기기 ID 제거 — 로그아웃 후 익명 상태가 계정 데이터(매물·메시지)를 계속 보지 않도록.
    // 다음 접근 시 새 익명 ID가 생성되고, 재로그인하면 계정 기준 ID를 다시 이어받는다 (lib/auth.js)
    localStorage.removeItem('modu_device_id')
  }

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
