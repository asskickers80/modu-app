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
 * Supabase 3단계 진단
 *  1단계: URL 헬스체크 (인증 없이) → URL 오류 구분
 *  2단계: apikey 헤더만으로 REST 요청 → sb_publishable_ 키 호환 방식
 *  3단계: supabase JS 클라이언트 쿼리 → 클라이언트 레벨 최종 확인
 */
export async function testConnection() {
  const keyInfo = supabaseAnonKey
    ? {
        prefix: supabaseAnonKey.slice(0, 20),
        length: supabaseAnonKey.length,
        hasSpace: supabaseAnonKey.includes(' '),
        hasQuote: supabaseAnonKey.includes('"') || supabaseAnonKey.includes("'"),
        type: supabaseAnonKey.startsWith('sb_publishable_')
          ? 'Publishable key (새 형식)'
          : supabaseAnonKey.startsWith('eyJ')
          ? 'JWT anon key (구 형식)'
          : '알 수 없는 형식',
      }
    : null

  console.log('[Supabase] ① 환경변수 확인')
  console.log('  URL:', supabaseUrl)
  console.log('  키 정보:', keyInfo)

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, code: 'ENV', keyInfo, message: '환경변수 없음\n.env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 입력 후 dev 서버 재시작' }
  }

  // ── 1단계: URL 도달 여부 확인 (응답 자체가 오면 URL은 정상) ──
  console.log('[Supabase] ② URL 도달 확인')
  try {
    const health = await fetch(`${supabaseUrl}/auth/v1/health`)
    // 401·403도 "서버가 응답했다" = URL 정상. 5xx나 네트워크 오류만 URL 문제.
    console.log('  헬스체크 상태:', health.status)
    if (health.status >= 500) {
      return { ok: false, code: 'URL', keyInfo, message: `Supabase 서버 오류 (${health.status}) — 잠시 후 다시 시도하거나 Supabase 상태 페이지를 확인해 주세요.` }
    }
  } catch (e) {
    return { ok: false, code: 'NETWORK', keyInfo, message: `URL 도달 불가 — VITE_SUPABASE_URL이 https://xxx.supabase.co 형식인지 확인해 주세요.\n오류: ${e.message}` }
  }

  // ── 2단계: anon key로 테이블 쿼리 테스트 ────────────────────
  // /rest/v1/ 루트는 service_role 전용. anon key는 테이블 단위 쿼리로 확인.
  // 존재하지 않는 테이블 → 인증 성공이면 PGRST 에러(42P01), 실패면 401
  console.log('[Supabase] ③ anon key 인증 테스트')
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/_modu_conn_check_?limit=1`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      }
    )
    const body = await res.json().catch(() => ({}))
    console.log('  상태:', res.status, '응답 본문:', body)

    // 401 → anon key 인증 실패
    if (res.status === 401) {
      const serverMsg = body.message ?? body.msg ?? JSON.stringify(body)
      console.error('[Supabase] ❌ 401 서버 응답:', body)
      return {
        ok: false, code: 'KEY', keyInfo,
        message: `키 인증 실패 (401)\n서버 응답: "${serverMsg}"\n\n확인 사항:\n1. Legacy anon key(eyJ...로 시작)를 복사했는지\n2. .env의 VITE_SUPABASE_ANON_KEY 값이 이 프로젝트 것인지\n3. 앞뒤 공백·따옴표가 없는지 (키 길이: ${keyInfo?.length ?? '?'}자)\n4. dev 서버를 재시작했는지`,
      }
    }

    // 200 또는 PGRST 에러(테이블 없음, 42P01) → 인증 성공
    console.log('[Supabase] ✅ 연결 성공')
    return { ok: true, code: 'OK', keyInfo, message: '연결 성공 ✓' }

  } catch (e) {
    return { ok: false, code: 'NETWORK', keyInfo, message: `네트워크 오류: ${e.message}` }
  }
}
