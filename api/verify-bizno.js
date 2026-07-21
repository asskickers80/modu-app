// 공개 게이트용 사업자번호 진위·상태 확인 (브라우저 → 이 함수 → 국세청).
// 결과 3분류: verified(공개 허용) / mismatch(공개 차단) / unavailable(장애 — 공개 허용).

import { fetchBusinessStatus, gateResultFromStatus } from './_ntsBusinessman.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ result: 'unavailable', error: 'method not allowed' })
  }
  const bizno = String(req.body?.bizno ?? '').replace(/[^0-9]/g, '')
  if (!/^\d{10}$/.test(bizno)) {
    return res.status(200).json({ result: 'mismatch', reason: 'format' })
  }

  const { ok, byBno } = await fetchBusinessStatus([bizno])
  // API 장애 — 공개를 막지 않는다 (완화안). 미검증 표식은 클라이언트가 남긴다.
  if (!ok) return res.status(200).json({ result: 'unavailable' })

  const entry = byBno[bizno]
  return res.status(200).json({
    result: gateResultFromStatus(entry),
    code: entry?.code ?? '',
  })
}
