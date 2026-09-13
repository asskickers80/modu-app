/**
 * 브랜드 언어 분리 lint (docs/BRAND.md) — 사용자 대면 화면 문자열에 대외 언어가 있으면 실패한다.
 * 대외 언어: 리테일 · 생태계 · 플랫폼 · 인프라. 허용 자리는 아래 ALLOWED 한 곳에만 둔다.
 * 검사 대상은 화면층(src/screens, src/components)과 문안 config. 주석·프롬프트·서버 코드는 검사하지 않는다.
 * npm run lint 에 포함. 테스트는 findBrandViolations 를 직접 import한다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const OUTWARD_WORDS = ['리테일', '생태계', '플랫폼', '인프라']
export const OUTWARD_RE = new RegExp(OUTWARD_WORDS.join('|'))

/** 허용 자리 (BRAND.md 언어 분리 원칙) — 설정>서비스 소개, 약관·처리방침, 개발 전용 화면, 외부 메타 */
export const ALLOWED = [
  /ServiceIntro[A-Za-z]*\.jsx$/,        // 설정 > 서비스 소개 (생기면 여기)
  /MyDetailPage\.jsx$/,                 // 이용약관·개인정보처리방침 본문
  /listingTerms\.js$/,                  // 등록 약관 고지 문구
  /BrandPreviewPage\.jsx$/,             // /dev/brand — 개발 전용
  /DevMenu\.jsx$/,                      // /dev — 개발 전용
  /^index\.html$/,                      // og:description 등 외부 공유 메타
]

/** 대표 판정 대기 — BRAND.md '알려진 예외' 표와 같은 목록. 새 위반은 여기 넣지 않는다 */
export const KNOWN = [
  { file: /A1Splash\.jsx$/, text: '자영업자를 위한 AI 리테일 생태계' },
]

/** @returns [{ file, line, token, why }] */
export function findBrandViolations(source, file = '<inline>') {
  if (ALLOWED.some(re => re.test(file))) return []
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''))
    .replace(/^[^\S\n]*\/\/.*$/gm, '')
    .replace(/[^\S\n]\/\/(?!\/).*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, m => m.replace(/[^\n]/g, ''))
  const known = KNOWN.filter(k => k.file.test(file)).map(k => k.text)
  const out = []
  stripped.split('\n').forEach((line, i) => {
    if (known.some(t => line.includes(t))) return           // 격리된 기존 문구
    const m = line.match(OUTWARD_RE)
    if (m) out.push({ file, line: i + 1, token: m[0], why: `대외 언어는 사용자 대면 화면에 쓰지 않는다 (docs/BRAND.md)` })
  })
  return out
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(jsx|ts)$/.test(name)) out.push(p)
  }
  return out
}

function main() {
  const files = ['src/screens', 'src/components', 'config'].flatMap(d => { try { return walk(d) } catch { return [] } })
  const v = files.flatMap(f => findBrandViolations(readFileSync(f, 'utf8'), f))
  for (const x of v) console.error(`[brand-lint] ${x.file}:${x.line} "${x.token}" — ${x.why}`)
  if (v.length) process.exit(1)
  console.log(`[brand-lint] ok (${files.length} files, 격리 ${KNOWN.length}건)`)
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
