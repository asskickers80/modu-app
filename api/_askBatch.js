/**
 * 모두에 질문하기 — 서버 배치 순수 룰 (ORDER 2026-09-13 A7·C2·C4).
 * ① 예시 사전 생성 큐(무료 등급 호출 제한 대비 지수 백오프) ② ② 질문 만료·리마인드 ③ 원문 90일 파기 ④ events → facts 집계.
 * 사용자 화면에는 에러를 노출하지 않는다 — 실패한 매물은 다음 배치로 미룬다.
 */
export const ASK_BATCH_COPY = {
  ownerRemind: '아직 답하지 않은 질문이 있어요',
  askerExpired: '주인이 답하지 않아 질문이 닫혔어요 · 문의하기로 직접 물어보실 수 있어요',
  ownerNotOpened: '아직 대화로 이어지지 않았어요',
}
export const RAW_KEEP_DAYS = 90
export const EXPIRE_DAYS = 7
export const REMIND_HOURS = 24

/** 지수 백오프 대기(ms) — 무료 등급 호출 제한(429) 대응 */
export const backoffMs = (attempt, base = 1000) => base * Math.pow(2, Math.max(0, attempt - 1))

/** 예시 생성 큐 — 실패분은 다음 배치로. @returns { done, retry } */
export function planExampleQueue(rows = [], { limit = 20 } = {}) {
  const due = rows.filter(r => !r.source_fields_hash || r.stale)
  return { queue: due.slice(0, limit), deferred: due.slice(limit) }
}

/** ② 질문 만료·리마인드 대상 (status='sent' 인 inquiry_ledger 행) */
export function askDue(rows = [], now = new Date()) {
  const expire = [], remind = []
  for (const r of rows ?? []) {
    if (r.status !== 'sent' || !r.ask_expires_at) continue
    const left = new Date(r.ask_expires_at) - now
    if (left <= 0) expire.push(r)
    else if (left <= REMIND_HOURS * 36e5 && !r.ask_reminded_at) remind.push(r)
  }
  return { expire, remind }
}

/** 전달했는데 7일 내 대화가 열리지 않은 건 — 양도인에게 있는 그대로 알린다(4박자) */
export function notOpenedDue(rows = [], now = new Date()) {
  return (rows ?? []).filter(r => r.status === 'replied' && r.ask_relayed_at
    && now - new Date(r.ask_relayed_at) >= EXPIRE_DAYS * 864e5 && !r.ask_not_opened_notified_at)
}

/** 원문 파기 대상 — 90일 초과 (행은 남기고 raw_text·pseudonym_id 만 NULL) */
export const purgeDue = (rows = [], now = new Date()) =>
  (rows ?? []).filter(r => (r.raw_text || r.pseudonym_id) && now - new Date(r.created_at) > RAW_KEEP_DAYS * 864e5)

export const hoursBand = h => (h == null ? 'none' : h < 6 ? 'lt6' : h < 24 ? 'lt24' : h < 72 ? 'lt72' : 'ge72')
export const monthOf = d => new Date(d).toISOString().slice(0, 7) + '-01'
const band = (v, steps, labels) => { if (v == null || v === '') return null; const n = Number(v); if (!Number.isFinite(n)) return null; for (let i = 0; i < steps.length; i++) if (n <= steps[i]) return labels[i]; return labels[labels.length - 1] }
export const floorBand = f => band(f, [1, 2], ['1f', '2f', 'upper'])
export const areaBand = a => band(a, [33, 66, 132], ['lt33', 'lt66', 'lt132', 'ge132'])
export const ageBand = y => (y ? band(new Date().getFullYear() - Number(y), [5, 15, 30], ['lt5', 'lt15', 'lt30', 'ge30']) : null)

/**
 * events(+연결 원장) → facts 행 집계. 원문·식별자는 넣지 않는다.
 * 전환 여부는 질문 발생 후 24시간 내 행동 기준.
 */
export function aggregateFacts(events = [], ledgers = [], listings = []) {
  const byId = new Map((ledgers ?? []).map(l => [l.id, l]))
  const listingById = new Map((listings ?? []).map(l => [l.id, l]))
  const map = new Map()
  for (const e of events ?? []) {
    const led = e.ledger_id ? byId.get(e.ledger_id) : null
    const li = listingById.get(e.target_id) ?? {}
    const within24h = t => t && new Date(t) - new Date(e.created_at) <= 864e5
    const replyHours = led?.ask_replied_at ? (new Date(led.ask_replied_at) - new Date(led.created_at)) / 36e5 : null
    const key = [
      monthOf(e.created_at), e.topic_axis, e.intent, e.branch,
      li.category_main ?? null, li.bjd_code ? String(li.bjd_code).slice(0, 5) : null,
      floorBand(li.floor), areaBand(li.area), ageBand(li.use_approval_date?.slice(0, 4)),
      !!e.answered, !!(led && within24h(led.created_at)), e.branch === 'price',
      !!led?.ask_replied_at, hoursBand(replyHours), led?.status === 'opened',
    ]
    const k = JSON.stringify(key)
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()].map(([k, count]) => {
    const [month, topic_axis, intent, branch, industry_code, region_code, listing_floor_band, listing_area_band, listing_age_band,
      answered, converted_to_inquiry, converted_to_price_inquiry, owner_replied, owner_reply_hours_band, opened_to_dm] = JSON.parse(k)
    return { month, topic_axis, intent, branch, industry_code, region_code, listing_floor_band, listing_area_band, listing_age_band, answered, converted_to_inquiry, converted_to_price_inquiry, owner_replied, owner_reply_hours_band, opened_to_dm, count }
  })
}

/** 월 1회 — other 버킷 상위 50개(사람이 보고 새 축·템플릿으로 승격) */
export function topOtherQuestions(events = [], limit = 50) {
  const counts = new Map()
  for (const e of events ?? []) {
    if (e.topic_axis !== 'other' || !e.raw_text) continue
    const k = e.raw_text.trim()
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([text, count]) => ({ text, count }))
}

/**
 * pseudonym — user_id 의 90일 회전 해시. 원본 id 는 어디에도 저장하지 않는다(C1).
 * 솔트는 서버 .env(ASK_PSEUDONYM_SALT). 회전하면 이전 해시와 일치하지 않는다(테스트 ⑮).
 */
export const epochOf = (d = new Date(), days = RAW_KEEP_DAYS) => Math.floor(new Date(d).getTime() / (days * 864e5))
export function pseudonymOf(userId, salt = '', epoch = epochOf()) {
  if (!userId) return null
  const s = `${salt}:${epoch}:${userId}`
  let h1 = 5381, h2 = 52711
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = ((h1 * 33) ^ c) >>> 0; h2 = ((h2 * 31) + c * (i + 1)) >>> 0 }
  return `p${h1.toString(36)}${h2.toString(36)}`
}
