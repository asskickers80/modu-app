/**
 * 실환경 스모크 — 데모 체감 경로 실증 (일회성, CI/테스트 스위트 미포함)
 *
 * 실행: node scripts/smoke/demo-smoke.mjs
 *
 * 검증 항목
 *  1) Gemini 실호출 3회 — E1 초안(generateListingDraft) / A7 코칭(generateSellerCoaching)
 *     / 시세 해석(generateMarketInsight) 실사용 프롬프트 그대로 (src/lib/gemini.js 미러)
 *     ※ "검수 프롬프트"는 코드베이스에 존재하지 않아 대상에서 제외
 *  2) Supabase Storage — 1px PNG 업로드 → public URL 200 → 삭제 (내부/외부 그리드가
 *     공용으로 쓰는 listings/ 경로 — 분리는 DB 컬럼(interior/exterior_image_urls)이지 경로가 아님)
 *  3) 국토부 실거래가 — 마포(11440) 1건, resultCode 000 + dealAmount 파싱
 *  4) RLS UPDATE 프로브 — anon key로 타 device_id 매물 no-op UPDATE (같은 값으로 원복 불필요)
 *
 * 안전장치: 업로드 파일은 finally에서 삭제, UPDATE는 기존 값 그대로(no-op), Gemini 3회 고정.
 * 키는 .env에서 읽고 출력하지 않는다.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { calcScore, listingToScoreInput } from '../../src/lib/completeness.js'

// ── .env 로드 (키 노출 금지) ─────────────────────────────────
const envPath = fileURLToPath(new URL('../../.env', import.meta.url))
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
)
const GEMINI_KEY = env.VITE_GEMINI_API_KEY
const PUB_KEY = env.VITE_PUBLIC_DATA_KEY
const SB_URL = env.VITE_SUPABASE_URL
const SB_ANON = env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SB_URL, SB_ANON)
const BUCKET = 'Modu Apps' // src/screens/e1/E1Step4.jsx:10
const results = []
const ok = (name, evidence) => { results.push({ name, ok: true, evidence }); console.log(`✅ ${name}\n   ${evidence}\n`) }
const fail = (name, evidence) => { results.push({ name, ok: false, evidence }); console.log(`❌ ${name}\n   ${evidence}\n`) }
const head = s => String(s).replace(/\s+/g, ' ').slice(0, 200)

// ── Gemini (src/lib/gemini.js askGemini 미러) ────────────────
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
async function askGemini(prompt) {
  const t0 = Date.now()
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }),
  })
  const ms = Date.now() - t0
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`status ${res.status}: ${head(JSON.stringify(err))}`)
  }
  const data = await res.json()
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '', ms }
}

// 실매물 1건 로드 (published, 필드 충실한 것 우선)
async function loadRealListing() {
  const { data, error } = await supabase.from('listings').select('*')
    .eq('status', 'published').not('shop_name', 'is', null)
    .order('created_at', { ascending: false }).limit(20)
  if (error || !data?.length) throw new Error(`실매물 조회 실패: ${error?.message}`)
  return data.find(r => r.address && r.deposit && r.transfer_fee) ?? data[0]
}

async function smokeGemini(listing) {
  // ① E1 초안 — src/lib/gemini.js generateListingDraft 프롬프트 그대로
  const TRANSFER_LABEL = { bare: '바닥권리 (시설·자리만 양도)', full: '영업양도 (시설+영업권 일체)', undecided: '미정' }
  const d = {
    shopName: listing.shop_name, address: listing.address, floor: listing.floor, area: listing.area,
    deposit: listing.deposit, monthlyRent: listing.monthly_rent, maintenance: listing.maintenance,
    transferType: listing.transfer_type, transferFee: listing.transfer_fee, monthlySales: listing.monthly_sales,
  }
  const hasSales = d.transferType === 'full' && !!d.monthlySales
  const draftPrompt = `
당신은 소상공인 점포 양도 전문 카피라이터입니다.
아래 매물 정보를 바탕으로 양수자에게 신뢰감을 주는 초안을 작성해 주세요.

[매물 정보]
상호명: ${d.shopName || '(미입력)'}
주소: ${d.address || '(미입력)'}
층수: ${d.floor || '(미입력)'} / 전용면적: ${d.area ? d.area + '㎡' : '(미입력)'}
보증금: ${d.deposit ? d.deposit + '만원' : '(미입력)'}
월세: ${d.monthlyRent ? d.monthlyRent + '만원' : '(미입력)'}
관리비: ${d.maintenance ? d.maintenance + '만원' : '없음'}
양도방식: ${TRANSFER_LABEL[d.transferType] ?? '(미입력)'}
희망 권리금: ${d.transferFee ? d.transferFee + '만원' : '(미입력)'}
${hasSales ? `월 평균 매출: ${d.monthlySales}만원` : ''}

[작성 원칙]
- 확인된 수치(주소·면적·임대조건·권리금 등)는 단정적 톤으로 서술하세요.
- 추정이 포함된 내용에는 반드시 "~로 추정됩니다", "~로 보입니다", "참고로" 같은 표현을 사용하세요.
- 과장·허위 표현 금지. 이모지·특수문자 없이 자연스러운 한국어 문장으로 작성하세요.
- description: 3~5문장, 매물의 핵심 가치 전달 (사실 위주)
- facility: 2~3문장, 시설 상태와 잔존가치 평가 (추정 포함)
${hasSales ? '- salesAnalysis: 2~3문장, 매출 기반 수익성 참고 분석 (추정 포함)' : ''}

[응답 형식] 마크다운 없이 순수 JSON만 반환하세요:
{
  "description": "...",
  "facility": "...",
  "salesAnalysis": ${hasSales ? '"..."' : 'null'}
}
`.trim()
  try {
    const { text, ms } = await askGemini(draftPrompt)
    const cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)[0])
    const valid = !!parsed.description && !!parsed.facility
    ;(valid ? ok : fail)('Gemini ① E1 초안 (generateListingDraft)',
      `${ms}ms · JSON 파싱 OK · description: "${head(parsed.description)}"`)
  } catch (e) { fail('Gemini ① E1 초안', e.message) }

  // ② A7 코칭 — generateSellerCoaching 프롬프트 그대로 (실매물 상황 입력)
  const photoCount = listing.image_urls?.length ?? 0
  const situation = {
    completeness: calcScore(listingToScoreInput(listing)),
    shopName: listing.shop_name, transferType: listing.transfer_type,
    photoCount, missingItems: photoCount === 0 ? ['매물 사진'] : [],
  }
  const lines = [
    `매물 완성도: ${situation.completeness}%`,
    `빠진 항목: ${situation.missingItems.length ? situation.missingItems.join(', ') : '없음'}`,
    `매물: ${situation.shopName}`,
  ]
  if (situation.transferType) lines.push(`양도 방식: ${situation.transferType}`)
  lines.push(`등록된 사진: ${photoCount}장`)
  const coachPrompt = `
당신은 소상공인 점포 양도를 돕는 AI 코치입니다.
아래 양도자의 현재 상황을 보고, 지금 가장 도움이 될 코칭 한 마디를 생성하세요.

[현재 상황]
${lines.join('\n')}

[작성 원칙]
- 1~2문장, 60자 이내
- 수치를 1개 이상 언급하되 상황에 맞게
- 따뜻하고 간결한 토스 앱 톤 (존댓말, 쉬운 단어)
- 구체적인 다음 행동을 자연스럽게 유도
- 이모지·특수문자 없이 순수 텍스트만

코칭 문구 (문장만, 다른 설명 없이):
`.trim()
  try {
    const { text, ms } = await askGemini(coachPrompt)
    ;(text.trim() ? ok : fail)('Gemini ② A7 코칭 (generateSellerCoaching)',
      `${ms}ms · "${head(text.trim())}"`)
  } catch (e) { fail('Gemini ② A7 코칭', e.message) }

  return { listing }
}

// ③ 시세 해석 — generateMarketInsight 프롬프트 그대로 (실거래 파싱값 + 앱과 동일한 더미 상권)
async function smokeMarketInsight(listing, deals) {
  const prices = deals.map(x => x.price)
  const priceData = {
    trend: 'flat', trendPct: 0,
    avgKeyMoney: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    avgMonthlyRent: 175,
  }
  const districtData = { similarBizCount: 28, footTraffic: { weekend: 15000 }, vacancyRate: 4.2, survivalRate: { oneYear: 72 } }
  const myFee = Number(listing.transfer_fee) || 0
  const feeRatio = myFee && priceData.avgKeyMoney ? (myFee / priceData.avgKeyMoney).toFixed(2) : null
  const prompt = `
당신은 소상공인 점포 매매 전문 애널리스트입니다.
아래 시세·상권 데이터를 분석하고, 양도자에게 실질적으로 도움이 되는 2~3문장의 해석을 생성하세요.

[내 매물 조건]
희망 권리금: ${myFee || '미입력'}만원
월세: ${listing.monthly_rent || '미입력'}만원
면적: ${listing.area || '미입력'}㎡
주소: ${listing.address || '미입력'}

[인근 시세 데이터]
동종 평균 권리금: ${priceData.avgKeyMoney}만원${feeRatio ? ` (내 권리금은 평균의 ${feeRatio}배)` : ''}
권리금 가격대: ${priceData.priceRange.min}~${priceData.priceRange.max}만원
최근 가격 추이: 보합
평균 월세 (유사 규모): ${priceData.avgMonthlyRent}만원

[상권 데이터]
반경 300m 동종 업체: ${districtData.similarBizCount}개
주말 유동인구: 약 ${districtData.footTraffic.weekend.toLocaleString()}명
상가 공실률: ${districtData.vacancyRate}%
업종 1년 생존율: ${districtData.survivalRate.oneYear}%

[작성 원칙]
- 2~3문장, 80자 이내
- 확인된 수치는 직접 인용하며 단정 톤 사용 ("~입니다", "~에요")
- 추론·평가에는 반드시 "~로 보입니다", "참고로", "~로 추정됩니다" 표현 사용
- 양도자 입장에서 가격 전략에 직접 도움이 되는 관점으로
- 이모지·특수문자 없이 자연스러운 한국어 문장

해석 (문장만, 다른 설명 없이):
`.trim()
  try {
    const { text, ms } = await askGemini(prompt)
    ;(text.trim() ? ok : fail)('Gemini ③ 시세 해석 (generateMarketInsight)',
      `${ms}ms · "${head(text.trim())}"`)
  } catch (e) { fail('Gemini ③ 시세 해석', e.message) }
}

// ── Supabase Storage ────────────────────────────────────────
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function smokeStorage() {
  const paths = []
  try {
    for (const grid of ['interior', 'exterior']) {
      // E1Step4 uploadPhoto와 동일 경로 규칙 (두 그리드 모두 listings/ 공용)
      const path = `listings/smoke_${grid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`
      const { error } = await supabase.storage.from(BUCKET)
        .upload(path, PNG_1PX, { cacheControl: '3600', contentType: 'image/png' })
      if (error) { fail(`Storage 업로드 (${grid} 그리드 경로)`, error.message); continue }
      paths.push(path)
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const res = await fetch(data.publicUrl)
      ;(res.status === 200 ? ok : fail)(`Storage 업로드+공개 URL (${grid} 그리드 경로)`,
        `path=${path} · public URL HTTP ${res.status}`)
    }
  } finally {
    if (paths.length) {
      const { error } = await supabase.storage.from(BUCKET).remove(paths)
      if (error) fail('Storage 삭제(정리)', `${error.message} — 수동 삭제 필요: ${paths.join(', ')}`)
      else {
        // 삭제 검증: 재요청 시 200이 아니어야 함
        const res = await fetch(supabase.storage.from(BUCKET).getPublicUrl(paths[0]).data.publicUrl)
        ;(res.status !== 200 ? ok : fail)('Storage 삭제(정리)', `remove ${paths.length}건 · 재조회 HTTP ${res.status}`)
      }
    }
  }
}

// ── 국토부 실거래가 ──────────────────────────────────────────
async function smokeMolit() {
  const url = `https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade?serviceKey=${encodeURIComponent(PUB_KEY)}&LAWD_CD=11440&DEAL_YMD=202605&numOfRows=5&pageNo=1`
  try {
    // data.go.kr WAF가 비브라우저 UA를 차단하므로 브라우저 UA 사용 (앱은 브라우저에서 호출)
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0' } })
    const xml = await res.text()
    const resultCode = xml.match(/<resultCode>(\d+)<\/resultCode>/)?.[1]
    const deals = [...xml.matchAll(/<dealAmount>([\d,\s]+)<\/dealAmount>/g)]
      .map(m => Number(m[1].replace(/[,\s]/g, ''))).filter(n => n > 0)
    const pass = res.status === 200 && resultCode === '000' && deals.length > 0
    ;(pass ? ok : fail)('국토부 실거래가 (마포 11440, 202605)',
      `HTTP ${res.status} · resultCode=${resultCode} · dealAmount ${deals.length}건 파싱 (예: ${deals[0]?.toLocaleString()}만원)`)
    return pass ? deals : []
  } catch (e) { fail('국토부 실거래가', e.message); return [] }
}

// ── RLS UPDATE 프로브 (no-op — 같은 값으로 update, 원복 불필요) ──
async function smokeRls() {
  const myFakeDevice = 'smoke-probe-device' // 어떤 매물의 device_id와도 다름 = "타인" 시점
  const { data: rows } = await supabase.from('listings')
    .select('id, shop_name, device_id, floor').eq('status', 'published')
    .neq('device_id', myFakeDevice).limit(1)
  if (!rows?.length) { fail('RLS UPDATE 프로브', '대상 매물 없음'); return }
  const target = rows[0]
  const sqlEquiv = `update listings set floor = '${target.floor ?? ''}' where id = '${target.id}'; -- as anon`
  const { data: updated, error } = await supabase.from('listings')
    .update({ floor: target.floor }) // no-op: 기존 값 그대로
    .eq('id', target.id).select('id')
  if (error) {
    ok('RLS UPDATE 프로브 — 서버가 차단함', `${sqlEquiv} → 에러: ${error.message}`)
  } else if (updated?.length > 0) {
    fail('RLS UPDATE 프로브 — 서버 미차단 (타인 매물 수정 가능)',
      `${sqlEquiv} → ${updated.length}행 수정됨 (no-op이라 데이터 변화 없음) · 로그인 도입 시 RLS 강화 필요`)
  } else {
    ok('RLS UPDATE 프로브 — 0행 수정 (RLS가 막음)', `${sqlEquiv} → 0행`)
  }
}

// ── 실행 ────────────────────────────────────────────────────
console.log(`\n=== 모두 실환경 스모크 (${new Date().toISOString()}) ===\n`)
const listing = await loadRealListing()
console.log(`실매물 입력: "${listing.shop_name}" (id ${listing.id.slice(0, 8)}…, 완성도 ${calcScore(listingToScoreInput(listing))}%)\n`)
await smokeGemini(listing)
const deals = await smokeMolit()
if (deals.length) await smokeMarketInsight(listing, deals)
else console.log('⏭️ Gemini ③ 시세 해석 — 국토부 파싱 실패로 건너뜀 (호출 예산 보존)\n')
await smokeStorage()
await smokeRls()

const passed = results.filter(r => r.ok).length
console.log(`\n=== 결과: ${passed}/${results.length} 통과 ===`)
process.exitCode = results.some(r => !r.ok && !r.name.includes('미차단')) ? 1 : 0
