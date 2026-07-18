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

export default async function handler(req, res) {
  // Vercel 대시보드에 CRON_SECRET을 설정하면 크론 호출에만 응답 (미설정 시 개방 — 뉴스 캐시 갱신뿐이라 위험도 낮음)
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const failed = []
  let totalSaved = 0

  for (const { bizType, keyword } of BIZ_KEYWORDS) {
    try {
      const items = await fetchNews(keyword)
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

  res.status(failed.length === BIZ_KEYWORDS.length ? 500 : 200).json({
    ok: failed.length === 0,
    saved: totalSaved,
    failed,
    at: new Date().toISOString(),
  })
}
