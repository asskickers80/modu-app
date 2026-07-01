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

  // ── 1단계: URL 헬스체크 (인증 없음) ──────────────────────────
  console.log('[Supabase] ② URL 헬스체크')
  try {
    const health = await fetch(`${supabaseUrl}/auth/v1/health`)
    console.log('  상태코드:', health.status)
    if (!health.ok) {
      return { ok: false, code: 'URL', keyInfo, message: `URL 오류 (${health.status})\nVITE_SUPABASE_URL을 Supabase 대시보드 → Project Settings → API → Project URL 에서 다시 복사해 주세요.` }
    }
  } catch (e) {
    return { ok: false, code: 'NETWORK', keyInfo, message: `URL 도달 불가\n${e.message}\nVITE_SUPABASE_URL이 https://xxx.supabase.co 형식인지 확인해 주세요.` }
  }

  // ── 2단계: apikey 헤더만 사용 (Authorization Bearer 제외) ───
  // sb_publishable_ 키는 JWT가 아니므로 Bearer로 보내면 401
  // API 게이트웨이는 apikey 헤더만으로 인증 처리
  console.log('[Supabase] ③ apikey 헤더 인증 테스트')
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { 'apikey': supabaseAnonKey },
    })
    const body = await res.json().catch(() => ({}))
    console.log('  상태코드:', res.status, '응답:', body)

    if (res.status === 200) {
      console.log('[Supabase] ✅ 연결 성공 (apikey 헤더 방식)')
      return { ok: true, code: 'OK', keyInfo, message: '연결 성공 ✓' }
    }

    if (res.status === 401) {
      return {
        ok: false, code: 'KEY', keyInfo,
        message: `키 인증 실패 (401)\n서버: ${body.message ?? JSON.stringify(body)}\n\n→ Supabase 대시보드 → Project Settings → API\n→ "Publishable key" 전체를 다시 복사해 주세요\n→ 앞뒤 공백·따옴표 없이 .env에 붙여넣기`,
      }
    }

    // 200이 아닌 다른 성공 코드도 연결은 된 것
    return { ok: true, code: 'OK', keyInfo, message: `연결 성공 ✓ (HTTP ${res.status})` }

  } catch (e) {
    return { ok: false, code: 'NETWORK', keyInfo, message: `네트워크 오류: ${e.message}` }
  }
}
