/**
 * 브랜드 언어 분리 회귀 그물 (ORDER 2026-09-13 BRAND.md 작업 4)
 * 사용자 대면 화면 문자열에 대외 언어("리테일·생태계·플랫폼·인프라")가 등장하면 실패한다.
 * 허용 자리(설정>서비스 소개·약관·개발 화면·외부 메타)는 예외 목록으로만 둔다.
 */
import { test, expect } from './fixtures.js'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { findBrandViolations, OUTWARD_WORDS, ALLOWED, KNOWN } from '../scripts/lint-brand.mjs'

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(jsx|ts)$/.test(name)) out.push(p)
  }
  return out
}

test('① 대외 언어 4단어가 사용자 대면 화면 문자열에 있으면 검사가 잡는다', () => {
  for (const w of OUTWARD_WORDS) {
    const hit = findBrandViolations(`const t = "자영업 ${w} 이야기"`, 'src/screens/A7SellerDashboard.jsx')
    expect(hit.length, w).toBeGreaterThan(0)
    expect(hit[0].token).toBe(w)
  }
  // JSX 텍스트도 잡는다
  expect(findBrandViolations('<p>우리 플랫폼이에요</p>', 'src/components/SomeCard.jsx')).toHaveLength(1)
  // 주석은 문안이 아니다
  expect(findBrandViolations('// 이벤트 로깅 인프라\nconst a = 1', 'src/components/SomeCard.jsx')).toEqual([])
  expect(findBrandViolations('/* 플랫폼 발송 알림 */\nconst a = 1', 'src/components/SomeCard.jsx')).toEqual([])
})

test('② 허용 자리(서비스 소개·약관·개발 화면·외부 메타)는 예외다', () => {
  for (const f of ['src/screens/ServiceIntroPage.jsx', 'src/screens/MyDetailPage.jsx', 'src/lib/listingTerms.js', 'src/screens/BrandPreviewPage.jsx', 'index.html']) {
    expect(findBrandViolations('const t = "대한민국 리테일 생태계를 잇는 플랫폼입니다"', f), f).toEqual([])
  }
  expect(ALLOWED.length).toBeGreaterThanOrEqual(5)
})

test('③ 실제 화면층 파일에 새 위반이 없다 (격리 목록은 BRAND.md 에 명시된 것만)', () => {
  const files = ['src/screens', 'src/components', 'config'].flatMap(d => walk(d))
  const v = files.flatMap(f => findBrandViolations(readFileSync(f, 'utf8'), f))
  expect(v.map(x => `${x.file}:${x.line} ${x.token}`)).toEqual([])
  // 격리된 기존 문구는 BRAND.md '알려진 예외' 표에 그대로 적혀 있어야 한다
  const brand = readFileSync('docs/BRAND.md', 'utf8')
  for (const k of KNOWN) expect(brand).toContain(k.text)
})

test('④ BRAND.md 가 정체성·카피 세트·어휘 규칙의 단일 소스다', () => {
  const brand = readFileSync('docs/BRAND.md', 'utf8')
  expect(brand).toContain('모두는 대한민국 리테일 생태계를 잇는 플랫폼이다')
  for (const line of [
    '리테일 생태계, 모두 여기에',
    '시작하는 사람도, 넘기는 사람도, 돕는 사람도',
    '모두는 대한민국 리테일 생태계를 잇는 플랫폼입니다',
    '대한민국 리테일 생태계 인프라',
    '혼자 알아보지 마세요. 모두가 다 알아봐 드립니다',
    '리테일 생태계 모두 여기에',
  ]) expect(brand, line).toContain(line)
  // 어휘 규칙 통합 — 축별 표와 금지 규칙
  for (const rule of ['권리금', '매매가', '가게', 'AI', '(예정)']) expect(brand).toContain(rule)
  // 다른 문서는 값을 복제하지 않고 이 파일을 가리킨다
  expect(readFileSync('CLAUDE.md', 'utf8')).toContain('docs/BRAND.md')
  expect(readFileSync('docs/principles/PRICING.md', 'utf8')).toContain('docs/BRAND.md')
})

test('⑤ index.html: 외부 공유 메타는 정체성 문구와 일치하고, 화면 title 은 그대로다', () => {
  const html = readFileSync('index.html', 'utf8')
  expect(html).toContain('<title>모두(modu)</title>')
  expect(html).toContain('content="모두는 대한민국 리테일 생태계를 잇는 플랫폼입니다"')
  expect(html).toMatch(/property="og:description"/)
})
