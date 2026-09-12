/**
 * 한마디 링크 페이지 (ORDER 2026-09-12 파트 C3) — /take/:token, 앱 밖 웹(비회원). 계정·전화·이메일을 받지 않는다.
 * 업체명 + 칩 1개 + 한 줄 150자 또는 음성 30초 → 표시명·업종 → [보내기]. require_login_for_take=true 면 로그인으로.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchInviteByToken, submitTake, uploadVoice } from '../lib/vendorTakes'
import { inviteState, takeGate, validateVoiceSec } from '../lib/vendorTakesRules'
import { TAKES, TAKE_CHIPS, TAKES_COPY } from '../../config/vendorTakes'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
// 개발 서버 전용 스위치(테스트 ⑦) — 실서비스 값은 config/vendorTakes.ts 의 require_login_for_take 하나뿐
const cfg = () => { try { return import.meta.env.DEV && localStorage.getItem('modu_dev_require_login_for_take') === '1' ? { ...TAKES, require_login_for_take: true } : TAKES } catch (_) { return TAKES } }

export default function TakeLinkPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [invite, setInvite] = useState(undefined)
  const [chip, setChip] = useState(null)
  const [mode, setMode] = useState('text') // text | voice
  const [body, setBody] = useState('')
  const [name, setName] = useState('')
  const [biz, setBiz] = useState('')
  const [rec, setRec] = useState({ state: 'idle', sec: 0, blob: null, url: null }) // idle | recording | done
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const recorder = useRef(null); const timer = useRef(null); const chunks = useRef([])

  useEffect(() => { fetchInviteByToken(token).then(i => setInvite(i ?? null)) }, [token])
  useEffect(() => { if (user !== undefined && takeGate(cfg(), user) === 'login') navigate('/a4', { replace: true }) }, [user, token, navigate])

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream); chunks.current = []
      mr.ondataavailable = e => chunks.current.push(e.data)
      mr.onstop = () => { const blob = new Blob(chunks.current, { type: 'audio/webm' }); setRec(r => ({ ...r, state: 'done', blob, url: URL.createObjectURL(blob) })); stream.getTracks().forEach(t => t.stop()) }
      recorder.current = mr; mr.start()
      setRec({ state: 'recording', sec: 0, blob: null, url: null })
      timer.current = setInterval(() => setRec(r => { const sec = r.sec + 1; if (sec >= TAKES.VOICE_SEC) stopRec(); return { ...r, sec } }), 1000)
    } catch (_) { setErr('마이크를 쓸 수 없어요 · 글로 남겨 주세요'); setMode('text') }
  }
  const stopRec = () => { clearInterval(timer.current); try { recorder.current?.state === 'recording' && recorder.current.stop() } catch (_) {} }

  const submit = async () => {
    if (!chip || !name.trim() || busy) return
    if (mode === 'voice' && (!rec.blob || !validateVoiceSec(rec.sec))) { setErr(`음성은 ${TAKES.VOICE_SEC}초까지예요`); return }
    setBusy(true); setErr('')
    let voiceUrl = null
    if (mode === 'voice') { voiceUrl = await uploadVoice(rec.blob, invite.id, rec.sec); if (!voiceUrl) { setBusy(false); setErr('음성을 올리지 못했어요 · 글로 남겨 주세요'); return } }
    const r = await submitTake(invite, { displayName: name, businessType: biz, chip, body: mode === 'text' ? body : null, voiceUrl, voiceSec: mode === 'voice' ? rec.sec : null })
    setBusy(false)
    if (r.ok) setDone(true)
    else setErr(r.reason === 'full' ? TAKES_COPY.full : r.reason === 'expired' ? TAKES_COPY.expired : r.reason === 'closed' ? TAKES_COPY.closed : '보내지 못했어요')
  }

  if (invite === undefined) return <div className="min-h-screen flex items-center justify-center text-t13 text-gray-400">불러오는 중…</div>
  const state = inviteState(invite)
  const notice = !invite ? TAKES_COPY.closed : state === 'expired' ? TAKES_COPY.expired : state === 'full' ? TAKES_COPY.full : state === 'closed' ? TAKES_COPY.closed : null

  return (
    <div className="min-h-screen bg-white" data-testid="take-link-page">
      <div className="max-w-[390px] mx-auto px-5 pt-12 pb-16">
        <p className="text-t12 font-bold" style={{ color: PURPLE }}>모두</p>
        <p className="text-t20 font-black text-gray-900 mt-1" data-testid="take-vendor-name">{invite?.vendorName ?? '업체'}</p>
        {done ? (
          <p className="text-t15 text-gray-800 mt-6" data-testid="take-done">{TAKES_COPY.done}</p>
        ) : notice ? (
          <p className="text-t14 text-gray-600 mt-6" data-testid="take-notice">{notice}</p>
        ) : (
          <>
            <p className="text-t15 font-bold text-gray-900 mt-4">{TAKES_COPY.linkTitle}</p>
            <p className="text-t12 text-gray-400 mt-1 mb-3">무엇을 맡기셨나요?</p>
            <div className="flex flex-wrap gap-2" data-testid="take-chips">
              {TAKE_CHIPS.map(c => (
                <button key={c} type="button" onClick={() => setChip(c)} data-testid={`take-chip-${c}`} aria-pressed={chip === c}
                  className="px-3.5 py-2.5 rounded-full text-t13 font-bold border" style={chip === c ? { backgroundColor: PURPLE, color: 'white', borderColor: PURPLE } : { borderColor: '#e5e7eb' }}>{c}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setMode('text')} data-testid="take-mode-text" aria-pressed={mode === 'text'} className="flex-1 py-2 rounded-xl text-t13 font-bold border" style={mode === 'text' ? { backgroundColor: PURPLE_BG, borderColor: PURPLE, color: PURPLE } : { borderColor: '#e5e7eb' }}>글로 남기기</button>
              <button type="button" onClick={() => setMode('voice')} data-testid="take-mode-voice" aria-pressed={mode === 'voice'} className="flex-1 py-2 rounded-xl text-t13 font-bold border" style={mode === 'voice' ? { backgroundColor: PURPLE_BG, borderColor: PURPLE, color: PURPLE } : { borderColor: '#e5e7eb' }}>음성으로 남기기</button>
            </div>
            {mode === 'text' ? (
              <>
                <textarea value={body} onChange={e => setBody(e.target.value.slice(0, TAKES.BODY_MAX))} rows={3} data-testid="take-body" placeholder="한 줄로 남겨 주세요"
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-t14" />
                <p className="text-t11 text-gray-400 text-right">{body.length}/{TAKES.BODY_MAX}</p>
              </>
            ) : (
              <div className="mt-3 rounded-2xl border border-gray-100 px-4 py-3" data-testid="take-voice">
                <p className="text-t12 text-gray-500">{TAKES.VOICE_SEC}초까지 녹음돼요 · 다시 녹음할 수 있어요</p>
                <div className="flex items-center gap-2 mt-2">
                  {rec.state === 'recording'
                    ? <button type="button" onClick={stopRec} data-testid="take-rec-stop" className="px-4 py-2 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: '#ef4444' }}>멈추기 · {rec.sec}초</button>
                    : <button type="button" onClick={startRec} data-testid="take-rec-start" className="px-4 py-2 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: PURPLE }}>{rec.state === 'done' ? '다시 녹음' : '녹음 시작'}</button>}
                  {rec.state === 'done' && <audio controls src={rec.url} className="flex-1" data-testid="take-rec-play" />}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <input value={name} onChange={e => setName(e.target.value.slice(0, TAKES.NAME_MAX))} placeholder="표시명 (예: 서교동 카페 사장)" data-testid="take-name" className="border border-gray-200 rounded-xl px-3 py-2.5 text-t14" />
              <input value={biz} onChange={e => setBiz(e.target.value.slice(0, TAKES.NAME_MAX))} placeholder="업종 (예: 카페)" data-testid="take-biz" className="border border-gray-200 rounded-xl px-3 py-2.5 text-t14" />
            </div>
            {err && <p className="text-t12 mt-2" style={{ color: '#A65A0C' }} data-testid="take-error">{err}</p>}
            <button type="button" onClick={submit} disabled={!chip || !name.trim() || busy} data-testid="take-submit"
              className="mt-4 w-full py-3.5 rounded-2xl text-t15 font-bold text-white disabled:opacity-40" style={{ backgroundColor: PURPLE }}>보내기</button>
            <p className="text-t11 text-gray-400 mt-2">계정·전화번호·이메일은 받지 않아요</p>
          </>
        )}
      </div>
    </div>
  )
}
