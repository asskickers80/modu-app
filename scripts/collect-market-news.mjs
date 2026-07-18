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

// 키워드는 짧게 — 네이버 sort=date는 "문구에 걸린 기사 중 최신"이라 긴 문구일수록 옛 기사가 나온다
// (2026-07-18 실측: "헬스장 스포츠센터 창업" 최신=4월, "헬스장 창업" 최신=7/15).
// [주 키워드, 예비 키워드] — 주 키워드 최신 기사가 FRESH_DAYS보다 오래되면 예비로 재시도.
const FRESH_DAYS = 7
const BIZ_KEYWORDS = [
  { bizType: null,             keywords: ['자영업 상권', '소상공인'] },
  { bizType: '카페·디저트',    keywords: ['카페 창업', '카페 디저트'] },
  { bizType: '치킨·피자',      keywords: ['치킨 프랜차이즈', '치킨집'] },
  { bizType: '한식',           keywords: ['식당 창업', '외식업'] },
  { bizType: '분식·떡볶이',    keywords: ['분식집', '분식'] },
  { bizType: '중식·일식·양식', keywords: ['외식업', '레스토랑'] },
  { bizType: '주점·바',        keywords: ['주점 창업', '주류 트렌드'] },
  { bizType: '미용·뷰티',      keywords: ['미용실 창업', '뷰티 산업'] },
  { bizType: '헬스·스포츠',    keywords: ['헬스장 창업', '피트니스 산업'] },
  { bizType: '교육·학원',      keywords: ['학원 창업', '사교육'] },
  { bizType: '편의점·마트',    keywords: ['편의점 창업', '편의점'] },
  { bizType: '의류·패션',      keywords: ['의류 매장', '패션 유통'] },
  { bizType: '기타',           keywords: ['소상공인', '자영업'] },
]

const newestPubDate = (items) => Math.max(...items.map(i => new Date(i.pubDate).getTime() || 0))
const isFresh = (items) => Date.now() - newestPubDate(items) <= FRESH_DAYS * 24 * 60 * 60 * 1000

/** 키워드를 순서대로 시도 — 최신 기사가 FRESH_DAYS 이내면 채택, 전부 오래됐으면 그중 가장 신선한 결과 */
async function fetchFreshNews(keywords) {
  let best = null
  for (const keyword of keywords) {
    const items = await fetchNews(keyword)
    if (items.length === 0) continue
    if (!best || newestPubDate(items) > newestPubDate(best.items)) best = { keyword, items }
    if (isFresh(items)) return { keyword, items }
    await sleep(150)
  }
  return best ?? { keyword: keywords[0], items: [] }
}

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

  for (const { bizType, keywords } of BIZ_KEYWORDS) {
    const label = bizType ?? '공통'
    process.stdout.write(`  [${label}] "${keywords[0]}" 수집 중...`)

    try {
      const { keyword, items } = await fetchFreshNews(keywords)

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
