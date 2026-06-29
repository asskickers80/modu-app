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
 * Supabase 실연결 확인 — REST API에 실제 HTTP 요청을 보냄
 * returns { ok, code, message }
 *   code: 'OK' | 'ENV' | 'KEY' | 'URL' | 'NETWORK'
 */
export async function testConnection() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      code: 'ENV',
      message: '환경변수 없음 — .env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해 주세요.',
    }
  }

  try {
    // Supabase REST API 엔드포인트에 실제 HTTP 요청
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })

    if (res.status === 401) {
      const body = await res.json().catch(() => ({}))
      return {
        ok: false,
        code: 'KEY',
        message: `키 오류 (401) — Publishable key가 맞는지 확인해 주세요.\n서버 응답: ${body.message ?? 'Invalid API key'}`,
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        code: 'URL',
        message: `서버 오류 (HTTP ${res.status}) — VITE_SUPABASE_URL이 올바른지 확인해 주세요.`,
      }
    }

    // 200 = URL 정상 + 키 유효 = 연결 성공
    return {
      ok: true,
      code: 'OK',
      message: `연결 성공 ✓  (${supabaseUrl})`,
    }

  } catch (e) {
    const isNetworkErr = e instanceof TypeError
    return {
      ok: false,
      code: 'NETWORK',
      message: isNetworkErr
        ? `URL 도달 불가 — "${supabaseUrl}" 에 연결할 수 없어요.\nVITE_SUPABASE_URL을 확인해 주세요.`
        : `알 수 없는 오류: ${e.message}`,
    }
  }
}
