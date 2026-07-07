// 계약서 PDF 생성 — pdf-lib + 나눔고딕(subset 임베드), A4 1페이지 레이아웃
// 주의: 나눔고딕 Bold는 subset 임베드 시 글리프가 깨지는 문제가 있어
//       Regular 하나만 임베드하고 굵은 글씨는 이중 드로잉(fake bold)으로 처리한다.
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import {
  CONTRACT_TITLE, CONTRACT_PREAMBLE, CONTRACT_TERMS,
  HANDWRITTEN_NOTICE, BANK_INFO, COMPANY,
} from '../data/contract.js'
import { formatKoreanDate } from './format.js'

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 40
const CONTENT_W = A4.width - MARGIN * 2

const INK = rgb(0.1, 0.12, 0.16)
const GRAY = rgb(0.45, 0.48, 0.52)
const LINE = rgb(0.75, 0.78, 0.82)
const RED = rgb(0.82, 0.15, 0.15)

// 나눔고딕에 없는 특수문자 치환 (㈜ 등)
function pdfSafe(text) {
  return String(text ?? '').replaceAll('㈜', '(주)')
}

let fontBytesCache = null
async function loadFont(doc) {
  if (!fontBytesCache) {
    const res = await fetch('/fonts/NanumGothic-Regular.ttf')
    if (!res.ok) throw new Error('폰트 로드 실패')
    fontBytesCache = await res.arrayBuffer()
  }
  doc.registerFontkit(fontkit)
  return doc.embedFont(fontBytesCache, { subset: true })
}

// 한글은 아무 글자에서나 줄바꿈 가능 — 글자 단위로 접되, 공백이 있으면 공백 우선
function wrapText(font, text, size, maxWidth) {
  const lines = []
  let line = ''
  for (const ch of pdfSafe(text)) {
    if (ch === '\n') { lines.push(line); line = ''; continue }
    const candidate = line + ch
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
    } else {
      const lastSpace = line.lastIndexOf(' ')
      if (lastSpace > 4 && ch !== ' ') {
        lines.push(line.slice(0, lastSpace))
        line = line.slice(lastSpace + 1) + ch
      } else {
        lines.push(line)
        line = ch === ' ' ? '' : ch
      }
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function generateContractPdf(contract, images, signedDate) {
  const doc = await PDFDocument.create()
  const font = await loadFont(doc)
  const page = doc.addPage([A4.width, A4.height])

  const textWidth = (text, size) => font.widthOfTextAtSize(pdfSafe(text), size)

  // bold: 같은 글자를 0.3pt 옆에 한 번 더 그려 굵게 보이게
  function draw(text, { x, y, size, color = INK, bold = false }) {
    const t = pdfSafe(text)
    page.drawText(t, { x, y, size, font, color })
    if (bold) page.drawText(t, { x: x + 0.3, y, size, font, color })
  }

  function drawWrapped(text, { x, y, size, maxWidth, color = INK, lineGap = 3, underline = false, bold = false }) {
    const lines = wrapText(font, text, size, maxWidth)
    let cursor = y
    for (const line of lines) {
      draw(line, { x, y: cursor, size, color, bold })
      if (underline && line.trim()) {
        page.drawLine({
          start: { x, y: cursor - 1.5 },
          end: { x: x + textWidth(line, size), y: cursor - 1.5 },
          thickness: 0.6,
          color,
        })
      }
      cursor -= size + lineGap
    }
    return cursor
  }

  const won = n => `${Number(n || 0).toLocaleString('ko-KR')}원`
  let y = A4.height - MARGIN - 10

  // 제목
  const titleSize = 17
  const titleW = textWidth(CONTRACT_TITLE, titleSize)
  draw(CONTRACT_TITLE, { x: (A4.width - titleW) / 2, y, size: titleSize, bold: true })
  page.drawLine({ start: { x: (A4.width - titleW) / 2, y: y - 4 }, end: { x: (A4.width + titleW) / 2, y: y - 4 }, thickness: 1, color: INK })
  y -= 30

  // 전문
  y = drawWrapped(CONTRACT_PREAMBLE, { x: MARGIN, y, size: 8.5, maxWidth: CONTENT_W, lineGap: 3 })
  y -= 6

  // ── 계약 내용 표 ──────────────────────────────────────────
  const rowH = 22
  const labelW = 76
  const halfW = CONTENT_W / 2
  const rows = [
    [{ label: '상호', value: contract.storeName }, { label: '업종', value: contract.businessType }],
    [{ label: '사업자등록번호', value: contract.bizNo }, { label: '담당 에이전트', value: contract.agentName }],
    [{ label: '소재지', value: contract.address, full: true }],
    [{ label: '광고상품명', value: contract.productName }, { label: '광고료', value: `${won(contract.fee)} (부가세 별도)` }],
    [{ label: '부가세', value: won(contract.vat) }, { label: '총액', value: won(contract.total), boldValue: true }],
    [{ label: '광고개시일', value: formatKoreanDate(contract.startDate) }, { label: '광고기간', value: `${contract.periodMonths}개월` }],
    [{ label: '광고종료일', value: formatKoreanDate(contract.endDate) }, { label: BANK_INFO.label, value: `${BANK_INFO.bank} ${BANK_INFO.account} (${BANK_INFO.holder})`, small: true }],
  ]
  const tableTop = y
  for (const row of rows) {
    const cells = row[0].full
      ? [{ ...row[0], x: MARGIN, w: CONTENT_W }]
      : [{ ...row[0], x: MARGIN, w: halfW }, { ...row[1], x: MARGIN + halfW, w: halfW }]
    for (const cell of cells) {
      page.drawRectangle({ x: cell.x, y: y - rowH, width: labelW, height: rowH, color: rgb(0.95, 0.96, 0.97) })
      draw(cell.label, { x: cell.x + 6, y: y - rowH + 8, size: 7.5, color: GRAY, bold: true })
      draw(String(cell.value ?? ''), {
        x: cell.x + labelW + 8, y: y - rowH + 7.5,
        size: cell.small ? 7.5 : 9, bold: Boolean(cell.boldValue),
      })
    }
    y -= rowH
  }
  page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: tableTop - y, borderColor: LINE, borderWidth: 0.8 })
  for (let i = 1; i < rows.length; i++) {
    page.drawLine({ start: { x: MARGIN, y: tableTop - rowH * i }, end: { x: MARGIN + CONTENT_W, y: tableTop - rowH * i }, thickness: 0.5, color: LINE })
  }
  y -= 14

  // ── 약관 (제1조~제7조) ─────────────────────────────────────
  for (const term of CONTRACT_TERMS) {
    draw(term.title, { x: MARGIN, y, size: 8, color: term.emphasis ? RED : INK, bold: true })
    y -= 11
    y = drawWrapped(term.body, {
      x: MARGIN + 8, y, size: 7.5, maxWidth: CONTENT_W - 8,
      lineGap: 2.5, underline: Boolean(term.emphasis), color: term.emphasis ? RED : INK,
    })
    y -= 4
  }
  y -= 4

  // ── 자필 확인란 ───────────────────────────────────────────
  const boxH = 64
  const noticeW = CONTENT_W * 0.62
  page.drawRectangle({ x: MARGIN, y: y - boxH, width: CONTENT_W, height: boxH, borderColor: INK, borderWidth: 0.8 })
  page.drawLine({ start: { x: MARGIN + noticeW, y: y - boxH }, end: { x: MARGIN + noticeW, y }, thickness: 0.5, color: LINE })
  draw('중요내용 확인 (자필)', { x: MARGIN + 6, y: y - 12, size: 7.5, color: RED, bold: true })
  drawWrapped(HANDWRITTEN_NOTICE, {
    x: MARGIN + 6, y: y - 24, size: 6.8, maxWidth: noticeW - 12, lineGap: 2.2,
  })
  if (images.handwrittenPng) {
    const hwImg = await doc.embedPng(images.handwrittenPng)
    const areaW = CONTENT_W - noticeW - 12
    const areaH = boxH - 12
    const scale = Math.min(areaW / hwImg.width, areaH / hwImg.height)
    page.drawImage(hwImg, {
      x: MARGIN + noticeW + 6 + (areaW - hwImg.width * scale) / 2,
      y: y - boxH + 6 + (areaH - hwImg.height * scale) / 2,
      width: hwImg.width * scale,
      height: hwImg.height * scale,
    })
  }
  y -= boxH + 16

  // ── 서명일 ───────────────────────────────────────────────
  const dateText = formatKoreanDate(signedDate)
  draw(dateText, { x: (A4.width - textWidth(dateText, 10)) / 2, y, size: 10 })
  y -= 26

  // ── 서명란: 좌 광고주 / 우 회사 ─────────────────────────────
  draw('광고주', { x: MARGIN, y, size: 9, color: GRAY, bold: true })
  const nameText = `성명:  ${contract.customerName || ''}`
  draw(nameText, { x: MARGIN, y: y - 18, size: 11, bold: true })
  const nameW = textWidth(nameText, 11)
  draw('(서명)', { x: MARGIN + nameW + 60, y: y - 18, size: 8, color: GRAY })
  if (images.signaturePng) {
    const sigImg = await doc.embedPng(images.signaturePng)
    const sigH = 42
    const sigW = 110
    const scale = Math.min(sigW / sigImg.width, sigH / sigImg.height)
    page.drawImage(sigImg, {
      x: MARGIN + nameW + 10,
      y: y - 32,
      width: sigImg.width * scale,
      height: sigImg.height * scale,
    })
  }
  const rightX = MARGIN + CONTENT_W / 2 + 30
  draw('회사', { x: rightX, y, size: 9, color: GRAY, bold: true })
  draw(`주소: ${COMPANY.address}`, { x: rightX, y: y - 14, size: 8 })
  draw(`상호: ${COMPANY.name}`, { x: rightX, y: y - 26, size: 8 })
  draw(`대표이사: ${COMPANY.ceo}  (인)`, { x: rightX, y: y - 38, size: 8, bold: true })
  try {
    const stampBytes = await loadStampPng()
    const stampImg = await doc.embedPng(stampBytes)
    const stampSize = 44
    page.drawImage(stampImg, {
      x: rightX + textWidth(`대표이사: ${COMPANY.ceo}`, 8) + 2,
      y: y - 38 - stampSize / 2 + 4,
      width: stampSize,
      height: stampSize,
      opacity: 0.9,
    })
  } catch { /* 직인 없이 진행 */ }

  // 하단 안내
  draw('본 계약서는 전자적으로 작성·서명되었으며, 서명 시각과 기기 정보가 함께 기록됩니다.', {
    x: MARGIN, y: MARGIN - 14, size: 6.5, color: GRAY,
  })

  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

// 직인: public/stamp.png(투명 배경)이 있으면 사용, 없으면 캔버스로 임시 직인 생성
async function loadStampPng() {
  try {
    const res = await fetch('/stamp.png')
    if (res.ok && res.headers.get('content-type')?.includes('png')) {
      return await res.arrayBuffer()
    }
  } catch { /* 폴백으로 진행 */ }
  return makeFallbackStamp()
}

function makeFallbackStamp() {
  const size = 240
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = '#c81e1e'
  ctx.fillStyle = '#c81e1e'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 26, 0, Math.PI * 2)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 44px sans-serif'
  ctx.fillText('점포라인', size / 2, size / 2 - 22)
  ctx.font = 'bold 34px sans-serif'
  ctx.fillText('대표이사', size / 2, size / 2 + 26)
  ctx.font = 'bold 26px sans-serif'
  ctx.fillText('印', size / 2, size / 2 + 66)
  return new Promise(resolve => canvas.toBlob(b => b.arrayBuffer().then(resolve), 'image/png'))
}
