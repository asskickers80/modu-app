import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { testConnection } from '../lib/supabase'

const ERROR_GUIDE = {
  ENV: {
    title: '환경변수 없음',
    steps: [
      'modu-app/ 루트에 .env 파일이 있는지 확인',
      'VITE_SUPABASE_URL=https://xxx.supabase.co 형식으로 입력됐는지',
      'VITE_SUPABASE_ANON_KEY=sb_publishable_... 형식으로 입력됐는지',
      '.env 수정 후 dev 서버 재시작 (npm run dev)',
    ],
  },
  KEY: {
    title: 'API 키 오류',
    steps: [
      'Supabase 대시보드 → Project Settings → API',
      '"Publishable key" (sb_publishable_로 시작) 를 복사',
      '.env의 VITE_SUPABASE_ANON_KEY 값을 교체',
      'dev 서버 재시작',
    ],
  },
  URL: {
    title: 'URL 오류',
    steps: [
      'Supabase 대시보드 → Project Settings → API',
      '"Project URL" (https://xxx.supabase.co) 를 복사',
      '.env의 VITE_SUPABASE_URL 값을 교체',
      'dev 서버 재시작',
    ],
  },
  NETWORK: {
    title: 'URL 도달 불가',
    steps: [
      'VITE_SUPABASE_URL이 https://로 시작하는지 확인',
      'URL에 오타가 없는지 확인 (프로젝트 ID가 맞는지)',
      '인터넷 연결 상태 확인',
    ],
  },
}

export default function SupabaseTestPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // 'idle' | 'testing' | 'ok' | 'fail'
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

    if (r.ok) console.log('[Supabase] ✅ 연결 성공', r.message)
    else console.error('[Supabase] ❌ 연결 실패', r.code, r.message)
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

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
          Supabase 연결 테스트
        </h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
          실제 REST API에 HTTP 요청을 보내 연결을 확인합니다
        </p>

        {/* 환경변수 현황 */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '10px' }}>환경변수 현황</p>
          <EnvRow label="VITE_SUPABASE_URL" value={url} />
          <EnvRow label="VITE_SUPABASE_ANON_KEY" value={key} />
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
              <p key={i} style={{ fontSize: '12px', color: '#78350f', marginBottom: '4px' }}>
                {i + 1}. {s}
              </p>
            ))}
          </div>
        )}

        {/* 다시 테스트 */}
        <button
          onClick={run}
          disabled={status === 'testing'}
          style={{
            display: 'block', width: '100%',
            padding: '18px 0', borderRadius: '16px',
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
              🎉 연결 성공! 매물 저장 단계로 넘어갈 수 있어요
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
      <div>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', fontFamily: 'monospace' }}>{label}</p>
        <p style={{ fontSize: '11px', color: set ? '#6b7280' : '#ef4444', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {value ? (value.length > 40 ? value.slice(0, 40) + '…' : value) : '설정 안 됨'}
        </p>
      </div>
    </div>
  )
}

function ResultCard({ status, result, elapsed }) {
  const cfg = {
    idle:    { bg: '#f3f4f6', color: '#6b7280', icon: '⏳', title: '대기 중' },
    testing: { bg: '#eff6ff', color: '#1d4ed8', icon: '⏳', title: 'HTTP 요청 전송 중...' },
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
