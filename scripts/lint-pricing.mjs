/**
 * PRICING §1-1 lint — 정렬·노출 함수가 결제 등급(plan_tier 등)을 참조하면 실패한다.
 * npm run lint 에 포함(oxlint 뒤). 테스트는 findPricingSortViolations 를 직접 import한다.
 * 검사 대상: 이름에 sort/rank/order 가 들어가는 함수 본문 (src/, config/).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FORBIDDEN = /\b(plan_tier|planTier|vendor_paid|is_paid|isPaid|paid_until|premium|isPremium)\b/
const SORT_FN = /(?:function\s+(\w*(?:sort|rank|order)\w*)\s*\([^)]*\)\s*\{)|(?:(?:const|let|var)\s+(\w*(?:sort|rank|order)\w*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>\s*\{)/gi

function bodyFrom(source, openIdx) {
  let depth = 0
  for (let i = openIdx; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) return source.slice(openIdx, i + 1)
  }
  return source.slice(openIdx)
}

/** @returns [{ file, name, line, token }] */
export function findPricingSortViolations(source, file = '<inline>') {
  const out = []
  for (const m of source.matchAll(SORT_FN)) {
    const name = m[1] ?? m[2]
    const body = bodyFrom(source, m.index + m[0].length - 1)
    const hit = body.match(FORBIDDEN)
    if (hit) out.push({ file, name, line: source.slice(0, m.index).split('\n').length, token: hit[1] })
  }
  return out
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

function main() {
  const files = ['src', 'config'].flatMap(d => { try { return walk(d) } catch { return [] } })
  const violations = files.flatMap(f => findPricingSortViolations(readFileSync(f, 'utf8'), f))
  for (const v of violations) {
    console.error(`[pricing-lint] ${v.file}:${v.line} ${v.name}() 이 결제 등급(${v.token})을 참조합니다 — docs/principles/PRICING.md §1`)
  }
  if (violations.length) process.exit(1)
  console.log(`[pricing-lint] ok (${files.length} files)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
