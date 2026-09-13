/**
 * 브랜드 자산 생성 (2026-09-14) — 확정 원본 1장(배경 포함 PNG)에서 앱이 쓰는 모든 크기·색을 파생한다.
 *
 * 입력:  docs/brand/logo.png   (가로형 락업 1070×550, 흰 배경 포함 — 디자이너 확정본. 이 파일은 수정하지 않는다)
 * 출력:  public/brand/*.png · public/icon-*.png · public/apple-touch-icon.png · public/favicon-32.png
 *
 * 배경 제거는 "가장자리에서 이어진 흰색"만 지운다(테두리 flood fill).
 * 구슬 안쪽의 흰 광택은 가장자리와 이어져 있지 않아 살아남는다 — 전역 임계값 방식이면 구멍이 뚫린다.
 * 연한 하늘색 구슬(#dbe9f8 계열)은 채도 검사로 보호한다.
 *
 * 실행: node scripts/gen-brand-assets.mjs
 */
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'node:fs'

const SRC = 'docs/brand/logo.png'
const OUT = 'public/brand'

/** 역할색 — CATEGORY_CONFIG 와 같은 값. 실루엣은 이 색으로만 칠한다 */
export const ROLE_COLORS = {
  white:     '#FFFFFF',
  seller:    '#1a4d8f',
  landlord:  '#1e6b6b',
  operating: '#2d7a4f',
  business:  '#7d4ba3',
  browsing:  '#8a8a8e',
  brand:     '#1683B8',
}

/** 흰 배경 판정 — 밝고(lum) 색기 없는(chroma) 픽셀만 */
const isBg = (r, g, b, lum = 244, chroma = 12) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  return (0.299 * r + 0.587 * g + 0.114 * b) >= lum && (mx - mn) <= chroma
}

/** 테두리에서 이어진 흰 배경만 투명하게 (flood fill) */
export async function knockout(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: ch } = info
  const seen = new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h && !seen[y * w + x]) stack.push(x, y) }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop()
    const i = y * w + x
    if (seen[i]) continue
    seen[i] = 1
    const p = i * ch
    if (!isBg(data[p], data[p + 1], data[p + 2])) continue   // 배경이 아니면 여기서 멈춘다
    data[p + 3] = 0
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
  // 가장자리 반투명 처리 — 배경에 가까울수록 알파를 낮춰 흰 테를 줄인다
  for (let i = 0; i < w * h; i++) {
    const p = i * ch
    if (data[p + 3] === 0) continue
    if (!seen[i]) continue
    const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
    if (lum > 232 && Math.max(data[p], data[p + 1], data[p + 2]) - Math.min(data[p], data[p + 1], data[p + 2]) <= 14) {
      data[p + 3] = Math.max(0, Math.round(255 * (244 - lum) / 12))
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: ch } }).png()
}

/** 알파(모양)만 남겨 한 가지 색으로 칠한 실루엣 */
export async function silhouette(pngBuffer, hex) {
  const img = sharp(pngBuffer)
  const { width, height } = await img.metadata()
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(width * height * 4)
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b
    out[i * 4 + 3] = data[i * info.channels + 3]
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png()
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(`[brand] 원본이 없습니다: ${SRC}`)
    console.error('  디자이너 확정본(가로형 1070×550 PNG)을 이 경로에 넣고 다시 실행하세요.')
    process.exit(2)
  }
  mkdirSync(OUT, { recursive: true })
  const meta = await sharp(SRC).metadata()
  console.log(`[brand] 원본 ${meta.width}×${meta.height}`)

  // 1) 락업 — 원본 그대로(흰 배경 포함. D 애니메이션이 흰 카드 위에 얹는 구조라 그대로 쓴다)
  await sharp(SRC).png().toFile(`${OUT}/logo.png`)
  // 2) 락업 투명본 — 파란 배경 화면(A2 등)용
  const lockupCut = await (await knockout(SRC)).toBuffer()
  await sharp(lockupCut).trim().png().toFile(`${OUT}/logo-transparent.png`)
  // 3) 심볼만 — 왼쪽 영역 크롭 후 여백 정리
  const symbol = await sharp(lockupCut)
    .extract({ left: 0, top: 0, width: Math.round(meta.width * 0.47), height: meta.height })
    .trim().png().toBuffer()
  await sharp(symbol).toFile(`${OUT}/symbol.png`)
  const sm = await sharp(symbol).metadata()
  console.log(`[brand] 심볼 ${sm.width}×${sm.height}`)

  // 4) 역할색 실루엣 — 작은 자리(15~20px)·역할색 동그라미 안·파비콘용
  for (const [name, hex] of Object.entries(ROLE_COLORS)) {
    await (await silhouette(symbol, hex)).toFile(`${OUT}/symbol-${name}.png`)
  }

  // 5) 앱 아이콘 — 정사각 + 마스커블 안전여백(가장자리 10%)
  const pad = (size) => sharp(symbol)
    .resize(Math.round(size * 0.8), Math.round(size * 0.8), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: Math.round(size * 0.1), bottom: Math.round(size * 0.1),
      left: Math.round(size * 0.1), right: Math.round(size * 0.1),
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: '#ffffff' })
    .resize(size, size)
    .png()
  await pad(512).toFile('public/icon-512.png')
  await pad(192).toFile('public/icon-192.png')
  await pad(180).toFile('public/apple-touch-icon.png')
  await (await silhouette(symbol, ROLE_COLORS.brand)).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile('public/favicon-32.png')

  console.log('[brand] 생성 완료 — public/brand/*.png, 앱 아이콘 4종')
  console.log('[brand] 확인: /dev/brand 미리보기에서 크기별·역할색·파란 배경·로딩을 눈으로 보세요.')
}
if (process.argv[1] && process.argv[1].endsWith('gen-brand-assets.mjs')) main()
