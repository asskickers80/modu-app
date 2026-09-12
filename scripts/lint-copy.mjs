/**
 * 화면 문안 lint (ORDER 2026-09-10 공통 규칙) — 카드·config 문안에 금지어가 있으면 실패한다.
 *  - "AI" 단어 (화면 문안 금지)
 *  - 효능 문구: "N배", "늘어요", "지원금 받으세요" (자체 데이터 검증 전 금지, PRICING §1)
 * 검사 대상은 이 오더 계열의 카드·config 파일만 (기존 화면의 옛 문안은 별도 정리 대상).
 * npm run lint 에 포함. 테스트는 findCopyViolations 를 직접 import한다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FORBIDDEN = [
  { re: /(["'`])[^"'`\n]*\bAI\b[^"'`\n]*\1|>[^<\n]*\bAI\b[^<\n]*</, why: '"AI" 단어 금지 (문안·JSX 텍스트)' },
  { re: /\d+\s*배(?![가-힣])/, why: '효능 문구("N배") 금지' },
  { re: /늘어요/, why: '효능 문구("늘어요") 금지' },
  { re: /지원금 받으세요/, why: '결과 약속 문구 금지' },
  { re: /비싸|싸요|내리세요|좋은 자리/, why: '판단 문구 금지 — 숫자와 출처만 (2026-09-11)' },
  { re: /예상 권리금|추정/, why: '예측·추정 표현 금지 (2026-09-11)' },
  { re: /평점|별점|추천|인증|검증/, why: '후기·quiet·한마디 화면 금지어 (2026-09-12)' , files: /Review[A-Za-z]*\.jsx$|VendorDetailPage\.jsx$|VendorTakes[A-Za-z]*\.jsx$|Quiet[A-Za-z]*\.jsx$|reviews\.ts$|quiet\.ts$|vendorTakes\.ts$|review[A-Za-z]*\.js$|quiet[A-Za-z]*\.js$|vendorTakes[A-Za-z]*\.js$/ },
]
const TARGET_FILE = /^(GovLinkCard|SalesServiceCard|CompletenessNextCard|DemandSignalCard|NextActionCard|Watch[A-Za-z]*|VendorContactButtons|RebStatCard|PriceInquiry[A-Za-z]*|DemandInbox|AutofillConfirm[A-Za-z]*|Review[A-Za-z]*|VendorDetailPage|VendorTakes[A-Za-z]*|Quiet[A-Za-z]*)\.jsx$|^(salesSignalRules|completenessNext|nextAction[A-Za-z]*|watch[A-Za-z]*|demandSignals|rebStats[A-Za-z]*|priceInquiry[A-Za-z]*|placeLookup|listingIntro|inquiryDraft|review[A-Za-z]*|quiet[A-Za-z]*|vendorTakes[A-Za-z]*)\.js$/

/** 주석 제거 후 문자열·JSX 텍스트에서 금지어 검색 */
export function findCopyViolations(source, file = '<inline>') {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/(?!\/).*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  const out = []
  stripped.split('\n').forEach((line, i) => {
    for (const f of FORBIDDEN) {
      if (f.files && !f.files.test(file)) continue // 파일 범위가 있는 규칙은 해당 파일만
      const m = line.match(f.re)
      if (m) out.push({ file, line: i + 1, token: m[0], why: f.why })
    }
  })
  return out
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (dir.startsWith('config') ? /\.(ts|js)$/.test(name) : TARGET_FILE.test(basename(name))) out.push(p)
  }
  return out
}

/** 타 플랫폼 크롤링 금지 — 소스 전체(src·api·supabase)에서 문자열 검출 (2026-09-11 파트 B0) */
export const CRAWL_FORBIDDEN = ['place.naver.com', 'm.place.naver', 'map.kakao.com/link']
export function findCrawlViolations(source, file = '<inline>') {
  const out = []
  source.split('\n').forEach((line, i) => { for (const t of CRAWL_FORBIDDEN) if (line.includes(t)) out.push({ file, line: i + 1, token: t, why: '타 플랫폼 페이지 크롤링·링크 파싱 금지' }) })
  return out
}
function walkAll(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walkAll(p, out)
    else if (/\.(js|jsx|ts|tsx|mjs)$/.test(name)) out.push(p)
  }
  return out
}

function main() {
  const files = ['config', 'src/components', 'src/lib'].flatMap(d => { try { return walk(d) } catch { return [] } })
  const all = ['src', 'api', 'supabase'].flatMap(d => { try { return walkAll(d) } catch { return [] } })
  const v = [...files.flatMap(f => findCopyViolations(readFileSync(f, 'utf8'), f)), ...all.flatMap(f => findCrawlViolations(readFileSync(f, 'utf8'), f))]
  for (const x of v) console.error(`[copy-lint] ${x.file}:${x.line} "${x.token}" — ${x.why}`)
  if (v.length) process.exit(1)
  console.log(`[copy-lint] ok (${files.length} files)`)
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
