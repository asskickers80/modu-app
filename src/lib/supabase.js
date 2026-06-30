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

/**
 * Supabase 실연결 확인
 * raw fetch 대신 supabase JS 클라이언트를 사용 —
 * sb_publishable_ 키처럼 JWT가 아닌 새 형식도 클라이언트가 자동 처리.
 * returns { ok, code, message, keyInfo }
 */
export async function testConnection() {
  const keyInfo = supabaseAnonKey
    ? {
        prefix: supabaseAnonKey.slice(0, 20),
        length: supabaseAnonKey.length,
        type: supabaseAnonKey.startsWith('sb_publishable_')
          ? 'Publishable key (새 형식)'
          : supabaseAnonKey.startsWith('eyJ')
          ? 'JWT anon key (구 형식)'
          : '알 수 없는 형식',
      }
    : null

  console.log('[Supabase 테스트] URL:', supabaseUrl)
  console.log('[Supabase 테스트] 키:', keyInfo)

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false, code: 'ENV', keyInfo,
      message: '환경변수 없음 — .env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력 후 dev 서버를 재시작해 주세요.',
    }
  }

  try {
    // 존재하지 않는 테이블에 쿼리 → 인증 성공이면 "테이블 없음" 오류(42P01)
    // 인증 실패면 401 오류 → 키 문제
    const { error } = await supabase
      .from('_modu_connection_test_')
      .select('id')
      .limit(1)

    if (!error) {
      // 혹시 테이블이 있으면 그냥 성공
      return { ok: true, code: 'OK', keyInfo, message: `연결 성공 ✓` }
    }

    // 42P01 = "relation does not exist" → 인증은 됐고 테이블만 없는 것 → 성공
    if (
      error.code === '42P01' ||
      error.message?.includes('does not exist') ||
      error.message?.includes('not found') ||
      error.status === 404
    ) {
      return { ok: true, code: 'OK', keyInfo, message: `연결 성공 ✓  (테이블 없음은 정상 — 아직 생성 전)` }
    }

    // 401 → 키 인증 실패
    if (error.status === 401) {
      return {
        ok: false, code: 'KEY', keyInfo,
        message: `키 인증 실패 (401)\n서버 응답: ${error.message}`,
      }
    }

    // 그 외 서버 오류
    return {
      ok: false, code: 'SERVER', keyInfo,
      message: `서버 오류 (${error.status ?? '?'}): ${error.message}`,
    }

  } catch (e) {
    return {
      ok: false, code: 'NETWORK', keyInfo,
      message: `네트워크 오류 — URL을 확인해 주세요.\n${e.message}`,
    }
  }
}
