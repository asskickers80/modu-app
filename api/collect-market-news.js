// Vercel 서버리스 함수 — 동종 시장 동향 뉴스 배치 수집 (Vercel Cron이 매일 호출)
// scripts/collect-market-news.mjs와 동일 로직: 업종별 네이버 뉴스 검색 → market_news 캐시 교체.
// - 수집 실패한 업종은 건너뜀 (기존 데이터 유지), 가짜 기사 생성 없음
// - vercel.json crons: 매일 20:00 UTC (한국 새벽 5시)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3F2bWdxc2tlb2VncHF4bHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDg1NTksImV4cCI6MjA5ODMyNDU1OX0.Bx9YR8dW-1c8BYB62oPOraPZm93G9iydB2jV5jzXR2U'
// 출시 전 환경변수 이전 과제 유지 — Vercel 대시보드에 설정 시 그 값 우선 (kakao-auth와 동일 패턴)
const NAVER_CLIENT_ID = process.env.NAVER_NEWS_CLIENT_ID ?? 'Ll3pIPjTgx3LmLRjIARq'
const NAVER_CLIENT_SECRET = process.env.NAVER_NEWS_CLIENT_SECRET ?? '13Z_UXxbit'
const NAVER_NEWS_URL = 'https://openapi.naver.com/v1/search/news.json'
const DISPLAY = 5

// 키워드는 짧게 — 네이버 sort=date는 "문구에 걸린 기사 중 최신"이라 긴 문구일수록 옛 기사가 나온다.
// [주 키워드, 예비 키워드] — 주 키워드 최신 기사가 FRESH_DAYS보다 오래되면 예비로 재시도.
const FRESH_DAYS = 7
// biz_type 컬럼에는 categories.ts 대분류(category_main)를 넣는다.
// 예전엔 E1 평면 12종을 키로 썼는데, 프랜차이즈 매물의 biz_type은
// '외식 > 치킨' 형태라 어느 키와도 안 맞아 업종 뉴스가 영구히 매칭 실패했다.
const BIZ_KEYWORDS = [
  { bizType: null,             keywords: ['자영업 상권', '소상공인'] },
  { bizType: '요식업',         keywords: ['식당 창업', '외식업'] },
  { bizType: '카페·베이커리',  keywords: ['카페 창업', '베이커리'] },
  { bizType: '주점',           keywords: ['주점 창업', '주류 트렌드'] },
  { bizType: '도소매·판매',    keywords: ['편의점 창업', '소매 유통'] },
  { bizType: '미용·뷰티',      keywords: ['미용실 창업', '뷰티 산업'] },
  { bizType: '오락·레저',      keywords: ['헬스장 창업', '피트니스 산업'] },
  { bizType: '교육·서비스',    keywords: ['학원 창업', '사교육'] },
  { bizType: '숙박·사무·기타', keywords: ['소상공인', '자영업'] },
]

// 옛 평면 12종 키로 쌓인 행 — 이제 아무도 조회하지 않으므로 수집 때 함께 정리
const VALID_BIZ_TYPES = BIZ_KEYWORDS.map(b => b.bizType).filter(Boolean)

const sleep = ms => new Promise(r => setTimeout(r, ms))

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

const newestPubDate = items => Math.max(...items.map(i => new Date(i.pubDate).getTime() || 0))
const isFresh = items => Date.now() - newestPubDate(items) <= FRESH_DAYS * 24 * 60 * 60 * 1000

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

export default async function handler(req, res) {
  // Vercel 대시보드에 CRON_SECRET을 설정하면 크론 호출에만 응답 (미설정 시 개방 — 뉴스 캐시 갱신뿐이라 위험도 낮음)
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const failed = []
  let totalSaved = 0

  for (const { bizType, keywords } of BIZ_KEYWORDS) {
    try {
      const { keyword, items } = await fetchFreshNews(keywords)
      if (items.length === 0) continue // 결과 없는 업종은 기존 데이터 유지

      const { error: delErr } = bizType
        ? await supabase.from('market_news').delete().eq('biz_type', bizType)
        : await supabase.from('market_news').delete().is('biz_type', null)
      if (delErr) throw new Error('DELETE 실패: ' + delErr.message)

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
    } catch (e) {
      failed.push({ bizType: bizType ?? '공통', error: e.message })
    }
    await sleep(150) // 네이버 API 속도 제한 여유
  }

  // 옛 키(평면 12종)로 남은 고아 행 정리 — 조회되지 않으면서 자리만 차지한다
  let orphansRemoved = 0
  try {
    const { data: orphans, error } = await supabase
      .from('market_news')
      .delete()
      .not('biz_type', 'is', null)
      .not('biz_type', 'in', `(${VALID_BIZ_TYPES.map(t => `"${t}"`).join(',')})`)
      .select('id')
    if (error) throw new Error(error.message)
    orphansRemoved = orphans?.length ?? 0
  } catch (e) {
    failed.push({ bizType: '(고아 행 정리)', error: e.message })
  }

  res.status(failed.length === BIZ_KEYWORDS.length ? 500 : 200).json({
    orphansRemoved,
    ok: failed.length === 0,
    saved: totalSaved,
    failed,
    at: new Date().toISOString(),
  })
}
