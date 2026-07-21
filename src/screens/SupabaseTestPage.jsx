import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { testConnection, supabase } from '../lib/supabase'

// [임시 진단] 로그인 세션 상태를 눈으로 보이게 — 세션 미인식 원인 추적용. 확정 후 이 블록 제거.
function SessionDiag() {
  const [live, setLive] = useState('확인 중...')
  const [dbg, setDbg] = useState(null)
  const [sbKeys, setSbKeys] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLive(data?.session ? `있음 ✓ (user ${data.session.user?.id?.slice(0, 8)}…)` : '없음 ✗')
    }).catch(e => setLive('오류: ' + e.message))
    try { setDbg(JSON.parse(localStorage.getItem('modu_auth_debug') || 'null')) } catch { setDbg(null) }
    setSbKeys(Object.keys(localStorage).filter(k => k.startsWith('sb-')))
  }, [])

  const ok = live.startsWith('있음')
  return (
    <div style={{ backgroundColor: ok ? '#dcfce7' : '#fef2f2', borderRadius: '16px', padding: '16px', marginBottom: '12px', border: `1px solid ${ok ? '#86efac' : '#fecaca'}` }}>
      <p style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>로그인 세션 진단</p>
      <p style={{ fontSize: '13px', color: ok ? '#166534' : '#b91c1c', fontWeight: 700 }}>
        지금 세션: {live}
      </p>
      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
        저장된 sb- 토큰: {sbKeys.length ? sbKeys.join(', ') : '없음'}
      </p>
      {dbg && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>마지막 카카오 로그인 기록</p>
          <pre style={{ fontSize: '11px', color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
{JSON.stringify(dbg, null, 1)}
          </pre>
        </div>
      )}
      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
        (카카오 로그인 직후 이 화면(/dev/supabase)에 들어와 이 카드를 스샷해 주세요)
      </p>
    </div>
  )
}

const ERROR_GUIDE = {
  ENV: {
    title: '환경변수 없음',
    steps: [
      'modu-app/ 루트에 .env 파일이 있는지 확인',
      'VITE_SUPABASE_URL=https://xxx.supabase.co 형식으로 입력됐는지',
      'VITE_SUPABASE_ANON_KEY=sb_publishable_... 형식으로 입력됐는지',
      '.env 수정 후 dev 서버 재시작 (Ctrl+C → npm run dev)',
    ],
  },
  KEY: {
    title: 'API 키 인증 실패',
    steps: [
      'Supabase 대시보드 → Project Settings → API',
      '"Publishable key" 항목 찾기 (sb_publishable_로 시작)',
      '값 전체를 복사 (앞뒤 공백·따옴표 없이)',
      '.env 파일에서 VITE_SUPABASE_ANON_KEY= 다음에 붙여넣기',
      'dev 서버 재시작 (Ctrl+C → npm run dev)',
    ],
  },
  SERVER: {
    title: '서버 응답 오류',
    steps: [
      'Supabase 프로젝트가 일시정지 상태인지 확인',
      '대시보드에서 프로젝트 상태 확인 (Paused 여부)',
    ],
  },
  NETWORK: {
    title: 'URL 도달 불가',
    steps: [
      'VITE_SUPABASE_URL이 https://로 시작하는지 확인',
      'URL 형식: https://[프로젝트ID].supabase.co',
      'Supabase 대시보드 → Project Settings → API → Project URL 복사',
      'dev 서버 재시작',
    ],
  },
}

export default function SupabaseTestPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [elapsed, setElapsed] = useState(null)

  const run = async () => {
    setStatus('testing')
    setResult(null)
    setElapsed(null)

    const t0 = Date.now()
    const r = await testConnection()
    const ms = Date.now() - t0

    setResult(r)
    setElapsed(ms)
    setStatus(r.ok ? 'ok' : 'fail')
  }

  useEffect(() => { run() }, [])

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  const guide = result ? ERROR_GUIDE[result.code] : null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '390px', margin: '0 auto' }}>

        <button onClick={() => navigate('/dev')}
          style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← DevMenu
        </button>

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Supabase 연결 테스트</h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
          supabase JS 클라이언트로 실제 DB 쿼리를 보내 연결·인증을 확인합니다
        </p>

        {/* [임시 진단] 로그인 세션 상태 — 카카오 로그인 후 이 화면에 들어와 확인 */}
        <SessionDiag />

        {/* 환경변수 현황 */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '10px' }}>환경변수 현황</p>
          <EnvRow label="VITE_SUPABASE_URL" value={url} />
          <EnvRow label="VITE_SUPABASE_ANON_KEY" value={key} />
          {key && (
            <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
                키 형식: {key.startsWith('sb_publishable_') ? '✅ Publishable key (새 형식)' : key.startsWith('eyJ') ? '⚠️ JWT anon key (구 형식)' : '❓ 알 수 없음'}
              </p>
              <p style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', marginTop: '2px' }}>
                앞 20자: <span style={{ color: '#111827' }}>{key.slice(0, 20)}…</span>
              </p>
              <p style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', marginTop: '2px' }}>
                키 길이: {key.length}자{key.includes(' ') ? ' ⚠️ 공백 포함!' : ''}{key.includes('"') || key.includes("'") ? " ⚠️ 따옴표 포함!" : ''}
              </p>
            </div>
          )}
        </div>

        {/* 결과 카드 */}
        <ResultCard status={status} result={result} elapsed={elapsed} />

        {/* 에러 가이드 */}
        {status === 'fail' && guide && (
          <div style={{ backgroundColor: '#fef9ee', borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid #fde68a' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '10px' }}>
              ⚠️ {guide.title} — 해결 방법
            </p>
            {guide.steps.map((s, i) => (
              <p key={i} style={{ fontSize: '12px', color: '#78350f', marginBottom: '4px' }}>{i + 1}. {s}</p>
            ))}
          </div>
        )}

        {/* 다시 테스트 */}
        <button onClick={run} disabled={status === 'testing'}
          style={{
            display: 'block', width: '100%', padding: '18px 0', borderRadius: '16px',
            backgroundColor: status === 'testing' ? '#d1d5db' : '#111827',
            color: '#fff', fontSize: '15px', fontWeight: 700,
            border: 'none', cursor: status === 'testing' ? 'default' : 'pointer',
            marginBottom: '12px',
          }}>
          {status === 'testing' ? '테스트 중...' : '다시 테스트'}
        </button>

        {status === 'ok' && (
          <div style={{ backgroundColor: '#dcfce7', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>
              연결 성공! 매물 저장 단계로 넘어갈 수 있어요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function EnvRow({ label, value }) {
  const set = !!value
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
      <span style={{ fontSize: '13px', flexShrink: 0 }}>{set ? '✅' : '❌'}</span>
      <div style={{ overflow: 'hidden' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', fontFamily: 'monospace' }}>{label}</p>
        <p style={{ fontSize: '11px', color: set ? '#6b7280' : '#ef4444', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {value ? (value.length > 50 ? value.slice(0, 50) + '…' : value) : '설정 안 됨'}
        </p>
      </div>
    </div>
  )
}

function ResultCard({ status, result, elapsed }) {
  const cfg = {
    idle:    { bg: '#f3f4f6', color: '#6b7280', icon: '⏳', title: '대기 중' },
    testing: { bg: '#eff6ff', color: '#1d4ed8', icon: '⏳', title: 'DB 쿼리 전송 중...' },
    ok:      { bg: '#dcfce7', color: '#15803d', icon: '✅', title: '연결 성공' },
    fail:    { bg: '#fee2e2', color: '#b91c1c', icon: '❌', title: '연결 실패' },
  }[status]

  return (
    <div style={{ backgroundColor: cfg.bg, borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: result ? '12px' : 0 }}>
        <span style={{ fontSize: '28px' }}>{cfg.icon}</span>
        <div>
          <p style={{ fontSize: '16px', fontWeight: 700, color: cfg.color }}>{cfg.title}</p>
          {elapsed != null && (
            <p style={{ fontSize: '11px', color: cfg.color, opacity: 0.7 }}>응답 시간: {elapsed}ms</p>
          )}
        </div>
      </div>
      {result && (
        <div style={{ backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '8px', padding: '10px' }}>
          <p style={{ fontSize: '12px', color: cfg.color, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {result.message}
          </p>
        </div>
      )}
    </div>
  )
}
