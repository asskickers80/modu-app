import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { testConnection } from '../lib/supabase'

export default function SupabaseTestPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('testing') // 'testing' | 'ok' | 'fail'
  const [message, setMessage] = useState('')
  const [log, setLog] = useState([])

  const run = async () => {
    setStatus('testing')
    setMessage('')
    const start = Date.now()
    addLog('Supabase 연결 테스트 시작...')

    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY

    addLog(`VITE_SUPABASE_URL: ${url ? url : '❌ 없음'}`)
    addLog(`VITE_SUPABASE_ANON_KEY: ${key ? key.slice(0, 20) + '...' : '❌ 없음'}`)

    const result = await testConnection()
    const ms = Date.now() - start

    addLog(`결과: ${result.message}  (${ms}ms)`)
    setStatus(result.ok ? 'ok' : 'fail')
    setMessage(result.message)

    if (result.ok) console.log('[Supabase] 연결 성공 ✓', result.message)
    else console.error('[Supabase] 연결 실패 ✗', result.message)
  }

  function addLog(line) {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${line}`])
  }

  useEffect(() => { run() }, [])

  const bg = status === 'testing' ? '#f3f4f6' : status === 'ok' ? '#dcfce7' : '#fee2e2'
  const color = status === 'testing' ? '#6b7280' : status === 'ok' ? '#15803d' : '#b91c1c'
  const icon = status === 'testing' ? '⏳' : status === 'ok' ? '✅' : '❌'

  return (
    <div className="min-h-screen bg-gray-50 p-5">
      <div className="max-w-[390px] mx-auto">
        <button onClick={() => navigate('/dev')}
          className="flex items-center gap-1 text-gray-400 text-[13px] mb-5">
          ← DevMenu
        </button>

        <h1 className="text-[20px] font-bold text-gray-900 mb-1">Supabase 연결 테스트</h1>
        <p className="text-[13px] text-gray-400 mb-6">환경변수와 실제 서버 연결 상태를 확인합니다</p>

        {/* 결과 카드 */}
        <div className="rounded-2xl p-5 mb-4 transition-all" style={{ backgroundColor: bg }}>
          <div className="flex items-center gap-3">
            <span className="text-[32px]">{icon}</span>
            <div>
              <p className="text-[16px] font-bold" style={{ color }}>
                {status === 'testing' ? '연결 확인 중...' : status === 'ok' ? '연결 성공' : '연결 실패'}
              </p>
              {message && (
                <p className="text-[12px] mt-0.5 break-all" style={{ color }}>{message}</p>
              )}
            </div>
          </div>
        </div>

        {/* 로그 */}
        <div className="rounded-2xl bg-gray-900 p-4 mb-4">
          <p className="text-[11px] font-bold text-gray-400 mb-2">콘솔 로그</p>
          {log.map((line, i) => (
            <p key={i} className="text-[11px] text-green-400 font-mono leading-relaxed">{line}</p>
          ))}
        </div>

        {/* 다시 테스트 */}
        <button
          onClick={run}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: '#111827' }}>
          다시 테스트
        </button>

        {/* 안내 */}
        <div className="mt-4 rounded-2xl bg-blue-50 p-4">
          <p className="text-[12px] text-blue-700 leading-relaxed font-semibold mb-1">연결 실패 시 확인 사항</p>
          <p className="text-[12px] text-blue-600 leading-relaxed">
            1. 프로젝트 루트에 <code className="bg-blue-100 px-1 rounded">.env</code> 파일이 있는지<br />
            2. <code className="bg-blue-100 px-1 rounded">VITE_SUPABASE_URL</code> 값이 <code className="bg-blue-100 px-1 rounded">https://xxx.supabase.co</code> 형식인지<br />
            3. <code className="bg-blue-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> 값이 <code className="bg-blue-100 px-1 rounded">sb_publishable_...</code>로 시작하는지<br />
            4. <code className="bg-blue-100 px-1 rounded">npm run dev</code>를 .env 수정 후 재시작했는지
          </p>
        </div>
      </div>
    </div>
  )
}
