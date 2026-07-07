// 계약서 PDF 생성 — pdf-lib + 나눔고딕(subset 임베드), A4 1페이지
// 원본(A청색NCR 광고계약 3차 수정약관) 레이아웃 재현.
// 주의: 나눔고딕 Bold는 subset 임베드 시 글리프가 깨지는 문제가 있어
//       Regular 하나만 임베드하고 굵은 글씨는 이중 드로잉(fake bold)으로 처리한다.
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import {
  CONTRACT_SUBTITLE, CONTRACT_DOC_TYPE, CONTRACT_TITLE, PROPERTY_TABLE_LABEL,
  CONTRACT_PREAMBLE, CONTRACT_DAUM, CONTRACT_TERMS, HANDWRITTEN_NOTICE,
  CLOSING_SENTENCE, BANK_INFO, COMPANY, toSegments,
} from '../data/contract.js'
import { formatKoreanDate } from './format.js'

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 38
const CONTENT_W = A4.width - MARGIN * 2

const INK = rgb(0.1, 0.12, 0.16)
const GRAY = rgb(0.42, 0.45, 0.5)
const LINE = rgb(0.62, 0.65, 0.7)
const LABEL_BG = rgb(0.93, 0.94, 0.95)

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

// __밑줄__ 세그먼트를 유지한 채 줄바꿈 → 줄마다 [{text,u}] 런 배열
// 한글은 글자 단위로 끊되, 영문/숫자/URL 구간은 중간에서 끊지 않고 통째로 다음 줄로 보낸다.
// 쉼표·마침표 등 닫는 문장부호는 줄 첫머리에 오지 않도록 이전 줄 끝에 붙인다.
function wrapRich(font, text, size, maxWidth) {
  const chars = []
  for (const seg of toSegments(pdfSafe(text))) {
    for (const ch of seg.text) chars.push({ ch, u: seg.u, w: font.widthOfTextAtSize(ch, size) })
  }

  const isTight = ch => /[A-Za-z0-9.\-/:%~]/.test(ch) // 중간에서 끊지 않을 구간
  const isClosing = ch => /[,.)\]%"'」』〕]/.test(ch) // 줄 첫머리 금지 문자

  const lines = []
  let line = []
  let lineW = 0
  let i = 0
  while (i < chars.length) {
    const c = chars[i]
    if (c.ch === ' ' && line.length === 0) { i++; continue } // 줄 첫머리 공백 제거
    if (lineW + c.w > maxWidth && line.length > 0) {
      if (isClosing(c.ch)) { // 문장부호는 폭을 살짝 넘겨도 이전 줄 끝에 붙인다
        line.push(c); i++
        lines.push(line); line = []; lineW = 0
        continue
      }
      let cut = line.length
      if (isTight(c.ch)) { // 영문/URL 구간 중간이면 구간 시작점에서 끊는다
        let k = line.length
        while (k > 0 && isTight(line[k - 1].ch)) k--
        if (k > 0 && line.length - k < 24) cut = k
      }
      const moved = line.splice(cut)
      lines.push(line)
      line = moved
      lineW = moved.reduce((s, m) => s + m.w, 0)
      continue // 같은 글자 다시 검사
    }
    line.push(c)
    lineW += c.w
    i++
  }
  if (line.length) lines.push(line)

  // 글자 배열 → 스타일 런 배열
  return lines.map(l => {
    const runs = []
    for (const c of l) {
      const last = runs[runs.length - 1]
      if (last && last.u === c.u) last.text += c.ch
      else runs.push({ text: c.ch, u: c.u })
    }
    if (runs.length) runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '')
    return runs.filter(r => r.text.length > 0)
  })
}

export async function generateContractPdf(contract, images, signedDate) {
  const doc = await PDFDocument.create()
  const font = await loadFont(doc)
  const page = doc.addPage([A4.width, A4.height])

  const textWidth = (text, size) => font.widthOfTextAtSize(pdfSafe(text), size)

  // bold: 같은 글자를 0.3pt 옆에 한 번 더 그려 굵게 보이게
  function draw(text, { x, y, size, color = INK, bold = false, underline = false }) {
    const t = pdfSafe(text)
    page.drawText(t, { x, y, size, font, color })
    if (bold) page.drawText(t, { x: x + 0.3, y, size, font, color })
    if (underline && t.trim()) {
      page.drawLine({
        start: { x, y: y - 1.4 }, end: { x: x + textWidth(t, size), y: y - 1.4 },
        thickness: 0.6, color,
      })
    }
    return textWidth(t, size)
  }

  // __밑줄__ 지원 문단 그리기. 반환: 다음 y
  function drawRich(text, { x, y, size, maxWidth, color = INK, lineGap = 2.6, bold = false }) {
    let cursor = y
    for (const runs of wrapRich(font, text, size, maxWidth)) {
      let rx = x
      for (const run of runs) {
        rx += draw(run.text, { x: rx, y: cursor, size, color, bold, underline: run.u })
      }
      cursor -= size + lineGap
    }
    return cursor
  }

  const won = n => `${Number(n || 0).toLocaleString('ko-KR')}원`
  let y = A4.height - MARGIN

  // ── 머리말 + 제목 ─────────────────────────────────────────
  draw(CONTRACT_SUBTITLE, { x: MARGIN, y, size: 7, color: GRAY })
  draw(CONTRACT_DOC_TYPE, { x: MARGIN + CONTENT_W - textWidth(CONTRACT_DOC_TYPE, 7), y, size: 7, color: GRAY })
  y -= 20
  const titleSize = 16
  draw(CONTRACT_TITLE, { x: (A4.width - textWidth(CONTRACT_TITLE, titleSize)) / 2, y, size: titleSize, bold: true })
  y -= 16

  // ── 광고 대상 매물의 표시 ──────────────────────────────────
  draw(PROPERTY_TABLE_LABEL, { x: MARGIN, y, size: 7.5, color: GRAY, bold: true })
  y -= 4
  const rowH = 19
  // 셀: [label, labelW, value, valueW]
  const w3 = CONTENT_W / 3
  const propRows = [
    [
      { label: '상호', labelW: 40, value: contract.storeName, w: w3 },
      { label: '업종', labelW: 40, value: contract.businessType, w: w3 },
      { label: '사업자등록번호', labelW: 64, value: contract.bizNo, w: w3 },
    ],
    [
      { label: '소재지', labelW: 40, value: contract.address, w: CONTENT_W - w3 },
      { label: '담당 에이전트', labelW: 64, value: contract.agentName, w: w3 },
    ],
  ]
  const propTop = y
  for (const row of propRows) {
    let cx = MARGIN
    for (const cell of row) {
      page.drawRectangle({ x: cx, y: y - rowH, width: cell.labelW, height: rowH, color: LABEL_BG })
      draw(cell.label, { x: cx + 4, y: y - rowH + 6.5, size: 7, color: GRAY, bold: true })
      draw(String(cell.value ?? ''), { x: cx + cell.labelW + 5, y: y - rowH + 6, size: 8.5 })
      page.drawLine({ start: { x: cx, y: y - rowH }, end: { x: cx, y }, thickness: 0.6, color: LINE })
      cx += cell.w
    }
    y -= rowH
  }
  page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: propTop - y, borderColor: LINE, borderWidth: 0.8 })
  page.drawLine({ start: { x: MARGIN, y: propTop - rowH }, end: { x: MARGIN + CONTENT_W, y: propTop - rowH }, thickness: 0.6, color: LINE })
  y -= 10

  // ── 전문 + "- 다 음 -" ───────────────────────────────────
  y = drawRich(CONTRACT_PREAMBLE, { x: MARGIN, y, size: 8, maxWidth: CONTENT_W, lineGap: 2.8 })
  y -= 2
  draw(CONTRACT_DAUM, { x: (A4.width - textWidth(CONTRACT_DAUM, 9)) / 2, y, size: 9, bold: true })
  y -= 15

  // ── 약관 제1조~제7조 ──────────────────────────────────────
  for (const term of CONTRACT_TERMS) {
    y = drawRich(term.title, { x: MARGIN, y, size: 8.5, maxWidth: CONTENT_W, bold: true, lineGap: 2.5 })
    y -= 1

    if (term.adTable) {
      // 광고조건 표: 헤더 + 값 (7열)
      const headers = ['광고상품명', '광고료', '부가세', '총액', '광고개시일', '광고종료일', '광고기간']
      const values = [
        contract.productName, won(contract.fee), won(contract.vat), won(contract.total),
        formatKoreanDate(contract.startDate), formatKoreanDate(contract.endDate), `( ${contract.periodMonths} )개월간`,
      ]
      const colW = CONTENT_W / 7
      const headH = 15
      const valH = 18
      const tTop = y
      page.drawRectangle({ x: MARGIN, y: y - headH, width: CONTENT_W, height: headH, color: LABEL_BG })
      headers.forEach((h, i) => {
        const cx = MARGIN + colW * i
        draw(h, { x: cx + (colW - textWidth(h, 6.8)) / 2, y: y - headH + 4.5, size: 6.8, color: GRAY, bold: true })
      })
      y -= headH
      values.forEach((v, i) => {
        const cx = MARGIN + colW * i
        const size = 7
        draw(String(v ?? ''), { x: cx + Math.max(2, (colW - textWidth(String(v ?? ''), size)) / 2), y: y - valH + 6, size, bold: i === 3 })
      })
      y -= valH
      page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: tTop - y, borderColor: LINE, borderWidth: 0.8 })
      page.drawLine({ start: { x: MARGIN, y: tTop - headH }, end: { x: MARGIN + CONTENT_W, y: tTop - headH }, thickness: 0.6, color: LINE })
      for (let i = 1; i < 7; i++) {
        page.drawLine({ start: { x: MARGIN + colW * i, y }, end: { x: MARGIN + colW * i, y: tTop }, thickness: 0.6, color: LINE })
      }
      y -= 12 // 표 테두리와 본문 첫 줄이 겹치지 않게 간격 확보
    }

    y = drawRich(term.body, { x: MARGIN + 6, y, size: 7.3, maxWidth: CONTENT_W - 6, lineGap: 2.3 })
    y -= 3

    if (term.bankAfter) {
      const bankText = `${BANK_INFO.label} : ${BANK_INFO.bank}  ${BANK_INFO.account}  예금주: ${BANK_INFO.holder}`
      const bandH = 17
      page.drawRectangle({ x: MARGIN, y: y - bandH, width: CONTENT_W, height: bandH, color: rgb(0.96, 0.96, 0.97), borderColor: INK, borderWidth: 1 })
      draw(bankText, { x: (A4.width - textWidth(bankText, 9.5)) / 2, y: y - bandH + 5.5, size: 9.5, bold: true })
      y -= bandH + 11
    }
  }
  y -= 2

  // ── 자필 확인란 ───────────────────────────────────────────
  const boxH = 58
  const hwAreaW = 118
  const noticeW = CONTENT_W - hwAreaW
  page.drawRectangle({ x: MARGIN, y: y - boxH, width: CONTENT_W, height: boxH, borderColor: INK, borderWidth: 1 })
  page.drawLine({ start: { x: MARGIN + noticeW, y: y - boxH }, end: { x: MARGIN + noticeW, y }, thickness: 0.8, color: INK })
  drawRich(HANDWRITTEN_NOTICE, { x: MARGIN + 6, y: y - 12, size: 7.2, maxWidth: noticeW - 12, lineGap: 2.4 })
  const hwLabel = '자필 확인 란'
  draw(hwLabel, { x: MARGIN + noticeW + (hwAreaW - textWidth(hwLabel, 7)) / 2, y: y - 11, size: 7, color: GRAY, bold: true })
  if (images.handwrittenPng) {
    const hwImg = await doc.embedPng(images.handwrittenPng)
    const areaW = hwAreaW - 10
    const areaH = boxH - 20
    const scale = Math.min(areaW / hwImg.width, areaH / hwImg.height)
    page.drawImage(hwImg, {
      x: MARGIN + noticeW + 5 + (areaW - hwImg.width * scale) / 2,
      y: y - boxH + 4 + (areaH - hwImg.height * scale) / 2,
      width: hwImg.width * scale,
      height: hwImg.height * scale,
    })
  }
  y -= boxH + 14

  // ── 마무리 문구 + 서명일 ──────────────────────────────────
  draw(CLOSING_SENTENCE, { x: MARGIN, y, size: 8.5, bold: true })
  const dateText = formatKoreanDate(signedDate)
  draw(dateText, { x: MARGIN + CONTENT_W - textWidth(dateText, 9), y, size: 9 })
  y -= 14

  // ── 서명 영역 (표): 광고주 / 회사 ──────────────────────────
  const signRowH = 30
  const signTop = y
  // 광고주 행
  page.drawRectangle({ x: MARGIN, y: y - signRowH, width: 52, height: signRowH, color: LABEL_BG })
  draw('광고주', { x: MARGIN + 4, y: y - signRowH + 11, size: 8, color: GRAY, bold: true })
  const nameText = `성  명:  ${contract.customerName || ''}`
  draw(nameText, { x: MARGIN + 62, y: y - signRowH + 10, size: 10.5, bold: true })
  const nameW = textWidth(nameText, 10.5)
  draw('(인)', { x: MARGIN + 62 + nameW + 130, y: y - signRowH + 10, size: 8, color: GRAY })
  if (images.signaturePng) {
    const sigImg = await doc.embedPng(images.signaturePng)
    const scale = Math.min(120 / sigImg.width, (signRowH + 12) / sigImg.height)
    page.drawImage(sigImg, {
      x: MARGIN + 62 + nameW + 12,
      y: y - signRowH - 2,
      width: sigImg.width * scale,
      height: sigImg.height * scale,
    })
  }
  y -= signRowH
  // 회사 행
  const coRowH = 26
  page.drawRectangle({ x: MARGIN, y: y - coRowH, width: 52, height: coRowH, color: LABEL_BG })
  draw('회사', { x: MARGIN + 4, y: y - coRowH + 9, size: 8, color: GRAY, bold: true })
  draw(`주 소: ${COMPANY.address}`, { x: MARGIN + 62, y: y - coRowH + 14, size: 7.5 })
  draw(`상 호: ${COMPANY.name}    대표이사: ${COMPANY.ceo}  (인)`, { x: MARGIN + 62, y: y - coRowH + 4, size: 7.5, bold: true })
  y -= coRowH
  page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: signTop - y, borderColor: LINE, borderWidth: 0.8 })
  page.drawLine({ start: { x: MARGIN, y: signTop - signRowH }, end: { x: MARGIN + CONTENT_W, y: signTop - signRowH }, thickness: 0.6, color: LINE })
  // 직인 — 대표이사 이름 위에 겹침
  try {
    const stampBytes = await loadStampPng()
    const stampImg = await doc.embedPng(stampBytes)
    const stampSize = 40
    page.drawImage(stampImg, {
      x: MARGIN + 62 + textWidth(`상 호: ${COMPANY.name}    대표이사: ${COMPANY.ceo}`, 7.5) + 2,
      y: y + coRowH / 2 - stampSize / 2,
      width: stampSize,
      height: stampSize,
      opacity: 0.9,
    })
  } catch { /* 직인 없이 진행 */ }

  // 하단 안내
  draw('본 계약서는 전자적으로 작성·서명되었으며, 서명 시각과 기기 정보가 함께 기록됩니다.', {
    x: MARGIN, y: 22, size: 6.5, color: GRAY,
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
