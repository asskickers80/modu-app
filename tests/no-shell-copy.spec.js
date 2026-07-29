/**
 * 프로토타입 잔재 문구 부재 회귀 (ORDER-e1p-shell-eliminate-v2 1부)
 * "실제 앱에서..." 류 = 완료 위장 카피 금지 — 이것이 실제 앱이다.
 * 소스 스캔 방식: 전 축·전 화면(토스트·플레이스홀더 포함)을 한 번에 커버.
 * ((예정) 감사가 "미구현/준비중" 계열만 잡고 "실제 앱" 계열을 놓친 누락 재발 차단)
 */
import { test, expect } from './fixtures.js'
import fs from 'fs'
import path from 'path'

const SCREENS = path.resolve('src/screens')
// 사용자 노출 확정 금지 패턴 (DevMenu 제외 — 개발자 메뉴는 프로덕트 비노출)
const BANNED = ['실제 앱에서', '실제 서비스에서', '데모 버튼', '🧪 더미', '프로토타입', '정식 버전에서']

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : (p.endsWith('.jsx') || p.endsWith('.js')) ? [p] : []
  })
}

test('전 화면 소스에 프로토타입 잔재 문구 없음', () => {
  const offenders = []
  for (const f of walk(SCREENS)) {
    if (f.includes('DevMenu')) continue
    const src = fs.readFileSync(f, 'utf8')
    for (const pat of BANNED) {
      if (src.includes(pat)) offenders.push(`${path.relative(process.cwd(), f)}: "${pat}"`)
    }
  }
  expect(offenders, `잔재 문구 발견:\n${offenders.join('\n')}`).toEqual([])
})
