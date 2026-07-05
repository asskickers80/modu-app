/**
 * 양도자 필독(seller_guide) · 오늘의한마디(coaching) 배치 생성
 * 실행: node scripts/generate-daily-contents.js
 *
 * 사전 조건:
 *   1. scripts/sql/create_daily_contents.sql 을 Supabase SQL Editor에서 실행했을 것
 *   2. 프로젝트 루트 .env 파일에 VITE_GEMINI_API_KEY 설정
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// ── .env 파싱 (Vite 전용 prefix 포함) ─────────────────────
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

// ── Gemini 호출 ────────────────────────────────────────────
async function askGemini(prompt) {
  if (!GEMINI_KEY) throw new Error('VITE_GEMINI_API_KEY 미설정')
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini ${res.status}: ${err?.error?.message ?? res.statusText}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function parseJsonArray(raw) {
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) throw new Error(`JSON 배열 파싱 실패: ${raw.slice(0, 100)}`)
  return JSON.parse(match[0])
}

// ── seller_guide 3건 생성 ──────────────────────────────────
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

// ── coaching 3건 생성 ──────────────────────────────────────
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

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  console.log(`\n모두 daily_contents 배치 생성 — ${TODAY}\n`)

  // Supabase 연결 확인
  const { error: connErr } = await supabase
    .from('daily_contents')
    .select('id', { count: 'exact', head: true })
  if (connErr) {
    console.error('Supabase 연결 실패:', connErr.message)
    console.error('→ scripts/sql/create_daily_contents.sql 을 먼저 실행하세요.')
    process.exit(1)
  }

  // 오늘 날짜 기존 데이터 삭제
  const { error: delErr } = await supabase
    .from('daily_contents')
    .delete()
    .eq('content_date', TODAY)
  if (delErr) {
    console.error('기존 데이터 삭제 실패:', delErr.message)
    process.exit(1)
  }
  console.log(`오늘(${TODAY}) 기존 데이터 삭제 완료\n`)

  const allCategories = [null, ...BIZ_TYPES] // null = 공통
  const rows = []
  const report = { seller_guide: {}, coaching: {} }

  for (const bizType of allCategories) {
    const label = bizType ?? '공통'
    process.stdout.write(`  [${label}] seller_guide 생성 중...`)
    const guides = await genSellerGuide(bizType)
    guides.forEach((body, i) => rows.push({ content_date: TODAY, content_type: 'seller_guide', biz_type: bizType, body, display_order: i }))
    report.seller_guide[label] = guides
    console.log(` 완료 (${guides.length}건)`)

    process.stdout.write(`  [${label}] coaching 생성 중...`)
    const coachings = await genCoaching(bizType)
    coachings.forEach((body, i) => rows.push({ content_date: TODAY, content_type: 'coaching', biz_type: bizType, body, display_order: i }))
    report.coaching[label] = coachings
    console.log(` 완료 (${coachings.length}건)`)
  }

  // Supabase INSERT (100건 단위 배치)
  console.log(`\n총 ${rows.length}건 INSERT 중...`)
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error } = await supabase.from('daily_contents').insert(batch)
    if (error) {
      console.error(`INSERT 실패 (${i}~${i + batch.length}):`, error.message)
      process.exit(1)
    }
  }
  console.log(`INSERT 완료: ${rows.length}건\n`)

  // 생성된 문구 전체 출력
  console.log('═'.repeat(60))
  console.log('생성된 전체 문구')
  console.log('═'.repeat(60))

  for (const [label, items] of Object.entries(report.seller_guide)) {
    console.log(`\n【양도자 필독 — ${label}】`)
    items.forEach((t, i) => console.log(`  ${i + 1}. ${t}`))
  }

  console.log()
  for (const [label, items] of Object.entries(report.coaching)) {
    console.log(`\n【오늘의 한마디 — ${label}】`)
    items.forEach((t, i) => console.log(`  ${i + 1}. ${t}`))
  }

  console.log('\n' + '═'.repeat(60))
  console.log('배치 완료')
}

main().catch(err => {
  console.error('\n오류:', err.message)
  process.exit(1)
})
