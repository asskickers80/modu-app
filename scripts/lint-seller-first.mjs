/**
 * 판매자 우선 lint (docs/향후개발아이디어_백로그.md 방향 원칙, 대표 결정 2026-09-15)
 *  ① 타 사용자(창업준비·방문자·기업회원) 화면에 등록일·등록 경과일을 렌더하면 실패
 *  ② 찜 알림 price 문안에 "→"·"내림"·"인하"·금액 토큰이 있으면 실패
 *  ③ '모두에 질문하기' 답변 화이트리스트에 등록일 키가 있으면 실패
 * npm run lint 에 포함. 테스트는 아래 함수를 직접 import 한다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 본인(양도인·소유주) 관리 화면 — 등록일 허용 */
export const OWNER_ALLOWED = [
  /listingDates\.js$/,          // 규칙을 담은 파일 자체
  /E1[A-Za-z]*\.jsx$/,          // 등록·수정 흐름(본인)
  /MyListingCard\.jsx$/, /DraftResumeCard\.jsx$/,
  /WatchOwnerCard\.jsx$/, /PeerStatsCard\.jsx$/,
  /A7SellerDashboard\.jsx$/, /A7LandlordDashboard\.jsx$/,
  /ReviewOpsPage\.jsx$/, /VendorOpsPage\.jsx$/, /AskTopicsOpsPage\.jsx$/, /DevMenu\.jsx$/, /BrandPreviewPage\.jsx$/,
  /Community[A-Za-z]*\.jsx$/,   // 커뮤니티 글 작성 시각은 매물 정보가 아니다
  /D4[A-Za-z]*\.jsx$/, /NotificationsPage\.jsx$/, /ReviewSection\.jsx$/,
]
/** 등록일을 화면에 찍는 표현 */
export const DATE_RENDER = [
  /\{[^}]*\b(?:listing|l|item|card|property)\.created_at[^}]*\}/,          // JSX 로 직접 출력
  /(?:timeAgo|dateLabel|formatDate|dayjs|moment)\([^)]*created_at/,        // 날짜 포맷 함수에 투입
  /(["'`])[^"'`\n]*(올라온 지|등록한 지|일 전 등록|등록일)[^"'`\n]*\1/,     // 문안
]
export function findSellerFirstViolations(source, file = '<inline>') {
  if (OWNER_ALLOWED.some(re => re.test(file))) return []
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''))
    .replace(/^[^\S\n]*\/\/.*$/gm, '')
    .replace(/[^\S\n]\/\/(?!\/).*$/gm, '')
  const out = []
  stripped.split('\n').forEach((line, i) => {
    for (const re of DATE_RENDER) {
      const m = line.match(re)
      if (m) out.push({ file, line: i + 1, token: m[0].slice(0, 40), why: '타 사용자 화면에 등록일·등록 경과일 금지 (판매자 우선 2026-09-15)' })
    }
  })
  return out
}

/** price 알림 문안 — 금액·인하 표현 금지 */
export const PRICE_COPY_FORBIDDEN = /→|내림|인하|\{from\}|\{to\}|\{amount\}|만원|\d[\d,]*만/
export function findPriceCopyViolations(copy, key = 'price') {
  if (key !== 'price' || typeof copy !== 'string') return []
  const m = copy.match(PRICE_COPY_FORBIDDEN)
  return m ? [{ key, token: m[0], why: 'price 알림 문안에 금액·인하 표현 금지 (2026-09-15 B3)' }] : []
}

/** 질문하기 화이트리스트에 등록일 키 금지 */
export const ASK_FORBIDDEN_KEYS = ['created_at', 'listed_days', 'registered_at', 'price_history']
export function findAskWhitelistViolations(keys = []) {
  return keys.filter(k => ASK_FORBIDDEN_KEYS.includes(k)).map(k => ({ key: k, why: '답변 재료에 등록일·가격 이력 금지 (2026-09-15 A2)' }))
}

/**
 * 기업회원 축 모듈이 저장 조건·수요 집계를 참조하면 실패 (2026-09-21 D3).
 * 저장 알림은 "매물을 찾는" 행동이지 "업체를 찾는" 행동이 아니다 — 기업회원에게 가지 않는다.
 * /dev 운영 화면(*OpsPage)은 대표·운영용이라 예외.
 */
export const DEMAND_TABLES = ['saved_searches', 'search_demand_facts', 'savedSearch']
export function findVendorDemandViolations(source, file = '<inline>') {
  if (!/business|vendor|Vendor|Business|E1b|e1b/.test(file) || /OpsPage\.jsx$/.test(file)) return []
  return DEMAND_TABLES
    .filter(t => source.includes(t))
    .map(t => ({ file, token: t, why: '기업회원 축은 저장 조건·수요 집계를 읽지 않는다 (2026-09-21 C2)' }))
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(jsx|js|ts)$/.test(basename(name))) out.push(p)
  }
  return out
}

async function main() {
  const files = ['src/screens', 'src/components'].flatMap(d => { try { return walk(d) } catch { return [] } })
  const v = files.flatMap(f => findSellerFirstViolations(readFileSync(f, 'utf8'), f))
  v.push(...files.flatMap(f => findVendorDemandViolations(readFileSync(f, 'utf8'), f).map(x => ({ ...x, line: 0 }))))
  const { NOTIF } = await import('../config/watch.ts')
  v.push(...findPriceCopyViolations(NOTIF.price).map(x => ({ file: 'config/watch.ts', line: 0, token: x.token, why: x.why })))
  const { DATA_KEYWORDS } = await import('../config/listingAsk.ts')
  v.push(...findAskWhitelistViolations(Object.keys(DATA_KEYWORDS)).map(x => ({ file: 'config/listingAsk.ts', line: 0, token: x.key, why: x.why })))
  for (const x of v) console.error(`[seller-first] ${x.file}:${x.line} "${x.token}" — ${x.why}`)
  if (v.length) process.exit(1)
  console.log(`[seller-first] ok (${files.length} files)`)
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
