// 원본 계약서 이미지 위 오버레이 좌표 (이미지 가로/세로에 대한 비율 0~1)
// 화면(ContractPaper)과 PDF(pdf.js)가 같은 좌표를 공유한다.
// 좌표는 2% 눈금 그리드를 원본 이미지에 겹쳐 측정한 값 — 이미지를 교체하면 재측정 필요.
export const FORM_IMAGE = '/contract-form.jpg'
export const FORM_RATIO = 1268 / 855 // 세로/가로

// x,y: 글자 시작점(baseline 기준). align: 'center'면 x가 중심점.
export const POS = {
  storeName:    { x: 0.185, y: 0.1345, size: 9 },
  businessType: { x: 0.505, y: 0.1345, size: 9 },
  bizNo:        { x: 0.808, y: 0.1345, size: 8.5 },
  address:      { x: 0.185, y: 0.1555, size: 9 },
  agentName:    { x: 0.808, y: 0.1555, size: 9 },

  // 제1조 광고조건 표 (7열) — 값 행
  productPatch: { x: 0.161, y: 0.2855, size: 7.5, align: 'center', patch: true }, // '광고'가 인쇄돼 있어 다를 때만 덮어씀
  fee:          { x: 0.290, y: 0.2855, size: 7.5, align: 'center' },
  vat:          { x: 0.400, y: 0.2855, size: 7.5, align: 'center' },
  total:        { x: 0.510, y: 0.2855, size: 7.5, align: 'center', bold: true },
  startDate:    { x: 0.6235, y: 0.2855, size: 7.5, align: 'center' },
  endDate:      { x: 0.745, y: 0.2855, size: 7.5, align: 'center' },
  periodPatch:  { x: 0.888, y: 0.2855, size: 7.5, align: 'center', patch: true }, // '( 3 )개월간' 인쇄됨 — 3개월 아닐 때만 덮어씀

  // 하단 "20  년  월  일" 빈칸
  signYY: { x: 0.718, y: 0.920, size: 9.5 },          // "20" 뒤 두 자리
  signMM: { x: 0.810, y: 0.920, size: 9.5, align: 'center' },
  signDD: { x: 0.896, y: 0.920, size: 9.5, align: 'center' },

  // 광고주 성명
  customerName: { x: 0.240, y: 0.9615, size: 10.5, bold: true },
}

// 이미지 영역(비율 사각형): x,y = 좌상단, w,h = 크기
// 직인 오버레이는 없음 — 원본 사진에 이미 회사 직인이 찍혀 있다.
export const RECTS = {
  handwriting: { x: 0.795, y: 0.845, w: 0.170, h: 0.052 }, // 자필 확인 란 ('들었음' 워터마크 위)
  signature:   { x: 0.300, y: 0.928, w: 0.160, h: 0.034 }, // 성명 옆 빈칸
}
