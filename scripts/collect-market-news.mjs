/**
 * 동종 시장 동향 — 네이버 뉴스 API 배치 수집
 * 실행: node scripts/collect-market-news.mjs
 *
 * 업종별 키워드로 뉴스 검색 → Supabase market_news 테이블에 캐시
 * - 배치 실행 시 업종별 기존 데이터 삭제 후 재삽입 (중복 방지)
 * - 수집 실패한 업종은 건너뜀 (기존 데이터 유지)
 * - 결과 없는 업종: DB에 빈 상태 → 화면은 정직하게 비움
 * - 가짜 기사·가짜 링크 생성 없음 — 수집된 것만 저장
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

function readEnv(key) {
  try {
    const content = fs.readFileSync('.env', 'utf8')
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'))
    return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : ''
  } catch { return '' }
}

const SUPABASE_URL    = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3F2bWdxc2tlb2VncHF4bHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDg1NTksImV4cCI6MjA5ODMyNDU1OX0.Bx9YR8dW-1c8BYB62oPOraPZm93G9iydB2jV5jzXR2U'
const NAVER_CLIENT_ID     = readEnv('NAVER_CLIENT_ID')
const NAVER_CLIENT_SECRET = readEnv('NAVER_CLIENT_SECRET')
const NAVER_NEWS_URL      = 'https://openapi.naver.com/v1/search/news.json'
const DISPLAY = 5

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function stripHtml(str) {
  if (!str) return ''
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .trim()
}

const BIZ_KEYWORDS = [
  { bizType: null,             keyword: '소상공인 상권 창업 동향' },
  { bizType: '카페·디저트',    keyword: '카페 디저트 창업 트렌드' },
  { bizType: '치킨·피자',      keyword: '치킨 피자 프랜차이즈' },
  { bizType: '한식',           keyword: '한식 식당 창업' },
  { bizType: '분식·떡볶이',    keyword: '분식 떡볶이 창업' },
  { bizType: '중식·일식·양식', keyword: '음식점 레스토랑 창업' },
  { bizType: '주점·바',        keyword: '주점 바 창업 트렌드' },
  { bizType: '미용·뷰티',      keyword: '미용실 뷰티 창업' },
  { bizType: '헬스·스포츠',    keyword: '헬스장 스포츠센터 창업' },
  { bizType: '교육·학원',      keyword: '학원 교육 창업' },
  { bizType: '편의점·마트',    keyword: '편의점 마트 소매업' },
  { bizType: '의류·패션',      keyword: '의류 패션 소매 창업' },
  { bizType: '기타',           keyword: '소상공인 자영업 상권' },
]

async function fetchNews(keyword) {
  const url = `${NAVER_NEWS_URL}?query=${encodeURIComponent(keyword)}&display=${DISPLAY}&sort=date`
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Naver API ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.items ?? []
}

async function main() {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 미설정')
    console.error('.env 파일에 두 키가 있는지 확인하세요.')
    process.exit(1)
  }

  const { error: connErr } = await supabase
    .from('market_news')
    .select('id', { count: 'exact', head: true })
  if (connErr) {
    console.error('Supabase 연결 실패:', connErr.message)
    console.error('→ scripts/sql/create_market_news.sql 을 먼저 실행하세요.')
    process.exit(1)
  }

  console.log(`\n모두 market_news 배치 수집 — ${new Date().toLocaleString('ko-KR')}\n`)

  const failed = []
  let totalSaved = 0

  for (const { bizType, keyword } of BIZ_KEYWORDS) {
    const label = bizType ?? '공통'
    process.stdout.write(`  [${label}] "${keyword}" 수집 중...`)

    try {
      const items = await fetchNews(keyword)

      if (items.length === 0) {
        console.log(' 결과 없음 (빈 상태 유지)')
        continue
      }

      // 해당 biz_type 기존 데이터 삭제
      const { error: delErr } = bizType
        ? await supabase.from('market_news').delete().eq('biz_type', bizType)
        : await supabase.from('market_news').delete().is('biz_type', null)
      if (delErr) throw new Error('DELETE 실패: ' + delErr.message)

      // 새 데이터 삽입 — originallink 우선 (실제 기사 원문 링크)
      const rows = items.map(item => ({
        biz_type: bizType,
        keyword,
        title: stripHtml(item.title),
        description: stripHtml(item.description),
        link: item.originallink || item.link,
        pub_date: item.pubDate,
      }))
      const { error: insErr } = await supabase.from('market_news').insert(rows)
      if (insErr) throw new Error('INSERT 실패: ' + insErr.message)

      totalSaved += rows.length
      console.log(` ${rows.length}건 저장`)
    } catch (e) {
      console.log(` 실패: ${e.message}`)
      failed.push({ label, keyword, error: e.message })
    }

    await sleep(300)
  }

  console.log(`\n수집 완료 — 총 ${totalSaved}건 저장`)

  if (failed.length > 0) {
    console.log(`\n⚠ 실패 ${failed.length}건:`)
    failed.forEach(f => console.log(`  - [${f.label}] "${f.keyword}": ${f.error}`))
    process.exit(1)
  } else {
    console.log('전 업종 정상 수집\n')
  }
}

main().catch(err => {
  console.error('\n오류:', err.message)
  process.exit(1)
})
