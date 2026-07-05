/**
 * 양도자 필독(seller_guide) · 오늘의한마디(coaching) 배치 생성
 * 실행: node scripts/generate-daily-contents.js
 *
 * 특징:
 *   - 호출 간 5초 대기 (레이트리밋 방지)
 *   - Gemini 실패 시 지수 백오프 재시도 (30s→60s→120s)
 *   - 범주별 즉시 저장 — 중간 실패해도 완료분 보존
 *   - 재실행 시 이미 생성된 범주는 건너뜀 (이어서 생성)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

function readEnv(key) {
  try {
    const content = fs.readFileSync('.env', 'utf8')
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'))
    return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : ''
  } catch { return '' }
}

const SUPABASE_URL = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3F2bWdxc2tlb2VncHF4bHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDg1NTksImV4cCI6MjA5ODMyNDU1OX0.Bx9YR8dW-1c8BYB62oPOraPZm93G9iydB2jV5jzXR2U'
const GEMINI_KEY  = readEnv('VITE_GEMINI_API_KEY')
const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const TODAY = new Date().toISOString().slice(0, 10)

const BIZ_TYPES = [
  '카페·디저트', '치킨·피자', '한식',
  '분식·떡볶이', '중식·일식·양식', '주점·바',
  '미용·뷰티', '헬스·스포츠', '교육·학원',
  '편의점·마트', '의류·패션', '기타',
]

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── Gemini 호출 — 지수 백오프 재시도 ─────────────────────────
async function askGemini(prompt) {
  if (!GEMINI_KEY) throw new Error('VITE_GEMINI_API_KEY 미설정')
  const delays = [30_000, 60_000, 120_000]
  let lastErr
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    })
    if (res.ok) {
      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }
    // 실패 — raw body 그대로 로그
    let rawBody = ''
    try { rawBody = JSON.stringify(await res.json()) } catch { rawBody = await res.text().catch(() => '') }
    lastErr = new Error(`Gemini ${res.status} (${res.statusText}): ${rawBody}`)
    if (attempt < delays.length) {
      const wait = delays[attempt]
      console.log(`\n    ⚠ ${lastErr.message}`)
      console.log(`    → ${wait / 1000}초 후 재시도 (${attempt + 1}/${delays.length})...`)
      await sleep(wait)
    }
  }
  throw lastErr
}

async function parseJsonArray(raw) {
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) throw new Error(`JSON 배열 파싱 실패: ${raw.slice(0, 100)}`)
  return JSON.parse(match[0])
}

async function genSellerGuide(bizType) {
  const bizLabel = bizType ? `업종: ${bizType}` : '업종: 공통 (업종 불문)'
  const prompt = `
당신은 소상공인 점포 양도 전문가입니다.
${bizLabel} 양도자가 양도를 진행할 때 꼭 알아야 할 핵심 노하우 팁 3가지를 생성하세요.

[작성 원칙]
- 각 팁은 2~3문장, 60~80자
- 실제 양도 과정에서 자주 놓치는 포인트 위주
- 따뜻하고 신뢰감 있는 토스 앱 톤 (존댓말, 쉬운 단어)
- 이모지·특수문자 없이 순수 텍스트
- 수치·기간 등 구체적인 정보 포함

[응답 형식] 마크다운 없이 순수 JSON 배열만:
["팁1", "팁2", "팁3"]
`.trim()
  const raw = await askGemini(prompt)
  return parseJsonArray(raw)
}

async function genCoaching(bizType) {
  const bizLabel = bizType ? `업종: ${bizType}` : '업종: 공통 (업종 불문)'
  const prompt = `
당신은 소상공인 점포 양도를 돕는 AI 코치입니다.
${bizLabel} 양도자에게 오늘 힘이 되는 코칭 문구 3가지를 생성하세요.

[작성 원칙]
- 각 문구는 1~2문장, 50~70자
- 양도 준비 중인 사람에게 실질적인 동기부여·격려
- 따뜻하고 간결한 토스 앱 톤 (존댓말, 쉬운 단어)
- 이모지·특수문자 없이 순수 텍스트
- 구체적인 다음 행동을 자연스럽게 유도

[응답 형식] 마크다운 없이 순수 JSON 배열만:
["문구1", "문구2", "문구3"]
`.trim()
  const raw = await askGemini(prompt)
  return parseJsonArray(raw)
}

// ── 오늘 이미 생성된 (biz_type, content_type) 조합 조회 ──────
async function fetchDoneKeys() {
  const { data, error } = await supabase
    .from('daily_contents')
    .select('biz_type, content_type')
    .eq('content_date', TODAY)
  if (error) throw new Error('완료 목록 조회 실패: ' + error.message)
  const done = new Set()
  for (const row of data ?? []) {
    done.add(`${row.biz_type ?? '__null__'}::${row.content_type}`)
  }
  return done
}

// ── 범주 1개 INSERT ──────────────────────────────────────────
async function saveRows(rows) {
  const { error } = await supabase.from('daily_contents').insert(rows)
  if (error) throw new Error('INSERT 실패: ' + error.message)
}

// ── 메인 ────────────────────────────────────────────────────
async function main() {
  console.log(`\n모두 daily_contents 배치 생성 — ${TODAY}\n`)

  // Supabase 연결 확인
  const { error: connErr } = await supabase
    .from('daily_contents')
    .select('id', { count: 'exact', head: true })
  if (connErr) {
    console.error('Supabase 연결 실패:', connErr.message)
    console.error('→ scripts/sql/create_daily_contents.sql 을 먼저 실행하고')
    console.error('  DISABLE ROW LEVEL SECURITY 및 GRANT 도 실행하세요.')
    process.exit(1)
  }

  // 이미 생성된 범주 파악 (이어서 생성 지원)
  const done = await fetchDoneKeys()
  if (done.size > 0) {
    console.log(`이미 완료된 범주 ${done.size / 2}개 — 해당 범주는 건너뜁니다.\n`)
  }

  const allCategories = [null, ...BIZ_TYPES]
  const failed = []
  const report = { seller_guide: {}, coaching: {} }
  let first = true

  for (const bizType of allCategories) {
    const label = bizType ?? '공통'
    const keyNull = bizType ?? '__null__'

    // seller_guide
    const sgKey = `${keyNull}::seller_guide`
    if (done.has(sgKey)) {
      console.log(`  [${label}] seller_guide 건너뜀 (이미 완료)`)
    } else {
      if (!first) await sleep(5_000)
      first = false
      process.stdout.write(`  [${label}] seller_guide 생성 중...`)
      try {
        const guides = await genSellerGuide(bizType)
        const rows = guides.map((body, i) => ({
          content_date: TODAY, content_type: 'seller_guide',
          biz_type: bizType, body, display_order: i,
        }))
        await saveRows(rows)
        report.seller_guide[label] = guides
        console.log(` 완료 (${guides.length}건)`)
      } catch (e) {
        console.log(` 실패: ${e.message}`)
        failed.push({ label, type: 'seller_guide' })
      }
    }

    // coaching
    const ckKey = `${keyNull}::coaching`
    if (done.has(ckKey)) {
      console.log(`  [${label}] coaching 건너뜀 (이미 완료)`)
    } else {
      await sleep(5_000)
      first = false
      process.stdout.write(`  [${label}] coaching 생성 중...`)
      try {
        const coachings = await genCoaching(bizType)
        const rows = coachings.map((body, i) => ({
          content_date: TODAY, content_type: 'coaching',
          biz_type: bizType, body, display_order: i,
        }))
        await saveRows(rows)
        report.coaching[label] = coachings
        console.log(` 완료 (${coachings.length}건)`)
      } catch (e) {
        console.log(` 실패: ${e.message}`)
        failed.push({ label, type: 'coaching' })
      }
    }
  }

  // ── 생성된 문구 전체 출력 ──────────────────────────────────
  if (Object.keys(report.seller_guide).length > 0 || Object.keys(report.coaching).length > 0) {
    console.log('\n' + '═'.repeat(60))
    console.log('이번 실행에서 생성된 문구')
    console.log('═'.repeat(60))

    for (const [lbl, items] of Object.entries(report.seller_guide)) {
      console.log(`\n【양도자 필독 — ${lbl}】`)
      items.forEach((t, i) => console.log(`  ${i + 1}. ${t}`))
    }
    for (const [lbl, items] of Object.entries(report.coaching)) {
      console.log(`\n【오늘의 한마디 — ${lbl}】`)
      items.forEach((t, i) => console.log(`  ${i + 1}. ${t}`))
    }
    console.log('\n' + '═'.repeat(60))
  }

  if (failed.length > 0) {
    console.log(`\n⚠ 실패 범주 ${failed.length}건:`)
    failed.forEach(f => console.log(`  - [${f.label}] ${f.type}`))
    console.log('→ 스크립트를 다시 실행하면 실패분만 이어서 생성합니다.\n')
    process.exit(1)
  } else {
    console.log('\n배치 완료 — 전 범주 정상 저장\n')
  }
}

main().catch(err => {
  console.error('\n오류:', err.message)
  process.exit(1)
})
