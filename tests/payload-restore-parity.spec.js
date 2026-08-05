/**
 * payload ↔ 역매핑 자동 대조 (ORDER-e1p-chip-restore-v1 재발 방지)
 * 사진(interior/exterior)·연차(facility_age)·입지(spot_*) 미복원 유형이 세 번째라,
 * 저장 필드를 추가하고 수정 복원을 빼먹으면 이 테스트가 즉시 잡는다.
 */
import { test, expect } from './fixtures.js'
import fs from 'fs'

// 파생·시스템 필드 — 저장은 하지만 폼 복원이 불필요한 것들 (합본·자동계산·저장 시점 생성)
const DERIVED = new Set(['image_urls', 'cap_rate', 'owner_nickname', 'terms_agreed_at',
  'latitude', 'longitude', 'bizno_verified_at', 'listing_type', 'deal_type',
  'updated_at', 'status', 'device_id', 'user_id'])

const payloadKeys = (src, blockRe) => {
  const m = src.match(blockRe)
  expect(m, 'payload 블록을 찾지 못함 — 파서 갱신 필요').toBeTruthy()
  return [...m[1].matchAll(/^\s+([a-z_]+):/gm)].map(x => x[1])
}
const restoredKeys = (src, fnName) => {
  const m = src.match(new RegExp(`export function ${fnName}\\(row\\) \\{([\\s\\S]*?)\\n\\}`))
  return new Set([...m[1].matchAll(/row\.([a-z_]+)/g)].map(x => x[1]))
}

test('E1(양도인): 저장 payload 전 필드가 수정 역매핑에 복원된다', () => {
  const step5 = fs.readFileSync('src/screens/e1/E1Step5.jsx', 'utf8')
  const comp = fs.readFileSync('src/lib/completeness.js', 'utf8')
  const keys = payloadKeys(step5, /const payload = \{([\s\S]*?)\n    \}/)
  const restored = restoredKeys(comp, 'listingToContext')
  const missing = keys.filter(k => !restored.has(k) && !DERIVED.has(k))
  expect(missing, `역매핑 누락: ${missing.join(', ')}`).toEqual([])
})

test('E1p(임대인): 저장 payload 전 필드가 수정 역매핑에 복원된다', () => {
  const step5 = fs.readFileSync('src/screens/e1p/E1pStep5.jsx', 'utf8')
  const comp = fs.readFileSync('src/lib/completeness.js', 'utf8')
  const keys = payloadKeys(step5, /function landlordPayload\(data\) \{\s*return \{([\s\S]*?)\n  \}/)
  const restored = restoredKeys(comp, 'listingToLandlordContext')
  const missing = keys.filter(k => !restored.has(k) && !DERIVED.has(k))
  expect(missing, `역매핑 누락: ${missing.join(', ')}`).toEqual([])
})
