/**
 * 새 로고 자산 (2026-09-14) — 원본 PNG 1장에서 파생하는 파이프라인과 로딩 컴포넌트.
 * ① 원본이 없으면 생성 스크립트가 정직하게 멈춘다 ② 배경 제거는 테두리에서 이어진 흰색만 지운다(안쪽 광택 보존)
 * ③ 실루엣은 모양만 남기고 한 색으로 칠한다 ④ 로딩은 그림이 없어도 화면이 비지 않는다(스피너 폴백)
 * ⑤ 동작 줄이기에서 빛줄기가 멈춰도 로딩 표시는 남는다 ⑥ 작은 인라인 로딩은 기존 스피너를 그대로 쓴다
 */
import { test, expect } from './fixtures.js'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { knockout, silhouette, ROLE_COLORS } from '../scripts/gen-brand-assets.mjs'

test.describe('자산 파이프라인 (유닛)', () => {
  test('① 원본이 없으면 스크립트가 멈추고 무엇을 넣어야 하는지 알려준다', () => {
    if (existsSync('docs/brand/logo.png')) test.skip(true, '원본이 이미 있어 이 경우는 해당 없음')
    let code = 0, out = ''
    try { execFileSync('node', ['scripts/gen-brand-assets.mjs'], { encoding: 'utf8' }) }
    catch (e) { code = e.status; out = String(e.stderr ?? '') }
    expect(code).toBe(2)
    expect(out).toContain('docs/brand/logo.png')
  })

  test('② 배경 제거: 테두리에서 이어진 흰색만 지우고, 도형 안쪽 흰 광택은 남는다', async () => {
    // 흰 배경 + 파란 사각형 + 그 안 흰 점(광택)
    const W = 40, H = 40
    const raw = Buffer.alloc(W * H * 3, 255)
    const put = (x, y, [r, g, b]) => { const p = (y * W + x) * 3; raw[p] = r; raw[p + 1] = g; raw[p + 2] = b }
    for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) put(x, y, [22, 131, 184])
    put(18, 18, [255, 255, 255]); put(19, 18, [255, 255, 255])   // 안쪽 광택
    const src = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()

    const cut = await (await knockout(src)).toBuffer()
    const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3]
    expect(alphaAt(1, 1)).toBe(0)          // 바깥 배경 → 투명
    expect(alphaAt(20, 20)).toBe(255)      // 도형 → 불투명
    expect(alphaAt(18, 18)).toBe(255)      // 안쪽 흰 광택 → 살아남음 (전역 임계값이면 여기 구멍)
  })

  test('③ 실루엣: 모양(알파)은 그대로, 색만 한 가지로 바뀐다', async () => {
    const W = 10, H = 10
    const rgba = Buffer.alloc(W * H * 4)
    for (let i = 0; i < W * H; i++) { rgba[i * 4] = 22; rgba[i * 4 + 1] = 131; rgba[i * 4 + 2] = 184; rgba[i * 4 + 3] = i < 50 ? 255 : 0 }
    const src = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
    const white = await (await silhouette(src, ROLE_COLORS.white)).toBuffer()
    const { data, info } = await sharp(white).raw().toBuffer({ resolveWithObject: true })
    expect([data[0], data[1], data[2], data[3]]).toEqual([255, 255, 255, 255])
    const last = (W * H - 1) * info.channels
    expect(data[last + 3]).toBe(0)          // 투명한 자리는 그대로 투명
    expect(Object.keys(ROLE_COLORS)).toEqual(expect.arrayContaining(['white', 'seller', 'landlord', 'operating', 'business', 'browsing', 'brand']))
  })

  test('⑥ 작은 인라인 로딩은 기존 스피너를 그대로 쓴다 (글자 넣을 자리가 아님)', () => {
    const loading = readFileSync('src/components/ModuLoading.jsx', 'utf8')
    expect(loading).toContain('ModuSpinner')          // 폴백으로만 연결
    for (const f of ['src/screens/e1/E1Step2.jsx', 'src/screens/d4/D4Chat.jsx', 'src/components/PhotoGrid.jsx']) {
      expect(readFileSync(f, 'utf8'), f).toContain('ModuSpinner')
      expect(readFileSync(f, 'utf8'), f).not.toContain('ModuLoading')
    }
  })
})

test('④⑤ 브랜드 미리보기: 그림이 없어도 화면이 비지 않고, 동작 줄이기에서도 로딩 표시가 남는다', async ({ page }) => {
  await page.goto('/dev/brand')
  const section = page.getByText('🆕 새 로고 — 실제 크기로 확인')
  await expect(section).toBeVisible()
  // 원본 PNG 가 없으면 이미지가 실패하고 스피너로 내려간다 — 어느 쪽이든 로딩 표시는 존재한다
  const loading = page.getByTestId('modu-loading')
  const spinner = page.getByRole('img', { name: 'loading' })
  await expect.poll(async () => (await loading.count()) + (await spinner.count())).toBeGreaterThan(0)
  if (await loading.count()) {
    await expect(loading).toHaveAttribute('aria-label', '불러오는 중')
    // 테스트는 reducedMotion=reduce 로 돈다 → 빛줄기는 숨고, 로딩 표시 자체는 남아야 한다
    await expect(loading.getByTestId('modu-loading-shimmer')).toBeHidden()
  }
})
