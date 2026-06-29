import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] 환경변수 미설정 — .env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 입력해 주세요.')
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? ''
)

/** Supabase 연결 상태 확인 — 테이블 없이도 동작 */
export async function testConnection() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, message: '환경변수가 설정되지 않았습니다. .env를 확인해 주세요.' }
  }
  try {
    const { error } = await supabase.auth.getSession()
    if (error) return { ok: false, message: `인증 오류: ${error.message}` }
    return { ok: true, message: `연결 성공 ✓  (${supabaseUrl})` }
  } catch (e) {
    return { ok: false, message: `네트워크 오류: ${e.message}` }
  }
}
