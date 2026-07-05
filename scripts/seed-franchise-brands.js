/**
 * 공정위 가맹사업 브랜드 시드 스크립트
 * 실행: node scripts/seed-franchise-brands.js
 *
 * 공공데이터포털 "공정거래위원회_가맹정보_브랜드 목록 정보 제공 서비스"
 * (https://www.data.go.kr/data/15125467/openapi.do)
 * 에서 전체 브랜드를 받아 franchise_brands 테이블에 저장한다.
 *
 * 주의: 실행 전 franchise_brands 테이블이 생성돼 있어야 함.
 *       기존 데이터가 있으면 삭제 후 재적재한다.
 */

import { createClient } from '@supabase/supabase-js'

// ── 설정 ──────────────────────────────────────────────────
const SUPABASE_URL = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3F2bWdxc2tlb2VncHF4bHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDg1NTksImV4cCI6MjA5ODMyNDU1OX0.Bx9YR8dW-1c8BYB62oPOraPZm93G9iydB2jV5jzXR2U'
const DATA_KEY     = '93703a6915a46b543640ce56b1de3fc78966af850d1442160af19127074d5303'
const BASE_YR      = '2024'   // 가맹사업기준년도
const PAGE_SIZE    = 1000

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── API 페이지 조회 ────────────────────────────────────────
async function fetchPage(pageNo) {
  const url = new URL('https://apis.data.go.kr/1130000/FftcBrandRlsInfo2_Service/getBrandinfo')
  url.searchParams.set('serviceKey', DATA_KEY)
  url.searchParams.set('pageNo',     String(pageNo))
  url.searchParams.set('numOfRows',  String(PAGE_SIZE))
  url.searchParams.set('resultType', 'json')
  url.searchParams.set('jngBizCrtraYr', BASE_YR)

  const resp = await fetch(url.toString())
  if (!resp.ok) throw new Error(`API HTTP ${resp.status}`)
  const data = await resp.json()
  if (data.resultCode !== '00') throw new Error(`API 오류: ${data.resultCode} ${data.resultMsg}`)
  return data
}

// ── 행 변환 ───────────────────────────────────────────────
function toRow(item) {
  const bizParts = [item.indutyLclasNm, item.indutyMlsfcNm].filter(Boolean)
  return {
    brand_name: item.brandNm,
    biz_type:   bizParts.join(' > ') || null,
    reg_no:     item.brandMnno  || null,
    franchisor: item.corpNm     || item.jnghdqrtrsRprsvNm || null,
  }
}

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  // 연결 확인
  const { error: connErr } = await supabase.from('franchise_brands').select('id', { count: 'exact', head: true })
  if (connErr) {
    console.error('Supabase 연결 실패:', connErr.message)
    console.error('→ franchise_brands 테이블이 생성됐는지 확인하세요.')
    process.exit(1)
  }

  // 기존 데이터 삭제 (재실행 안전)
  console.log('기존 데이터 삭제 중...')
  const { error: delErr } = await supabase.from('franchise_brands').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) {
    console.error('기존 데이터 삭제 실패:', delErr.message)
    console.error('→ Supabase 대시보드에서 RLS 정책을 확인하거나 service role key를 사용하세요.')
    process.exit(1)
  }

  // 첫 페이지로 총 건수 확인
  console.log('공공데이터포털 API 호출 중...')
  const first = await fetchPage(1)
  const total      = first.totalCount
  const totalPages = Math.ceil(total / PAGE_SIZE)
  console.log(`총 ${total.toLocaleString()}개 브랜드, ${totalPages}페이지 처리 시작\n`)

  let inserted = 0

  for (let page = 1; page <= totalPages; page++) {
    const data  = page === 1 ? first : await fetchPage(page)
    const items = Array.isArray(data.items) ? data.items : []
    const rows  = items.map(toRow)

    if (rows.length === 0) continue

    const { error } = await supabase.from('franchise_brands').insert(rows)
    if (error) {
      console.error(`페이지 ${page} insert 실패:`, error.message)
      process.exit(1)
    }

    inserted += rows.length
    const pct = Math.round(inserted / total * 100)
    process.stdout.write(`\r  진행: ${inserted.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`)
  }

  console.log(`\n\n완료: franchise_brands 테이블에 ${inserted.toLocaleString()}개 저장됨`)
}

main().catch(err => {
  console.error('\n오류:', err.message)
  process.exit(1)
})
