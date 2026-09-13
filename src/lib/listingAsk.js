/**
 * 모두에 질문하기 — 데이터 계층 (ORDER 2026-09-13 파트 A3·A4·A7). 판정은 listingAskRules(순수).
 * 예시·답변은 매물별 1회 생성 후 캐시(조회당 모델 호출 0). 자유 입력은 정규화 해시로 캐시.
 * 무료 등급(config/ai.ts ASK.tier) + 프로덕션이면 사용자 자유 입력을 모델에 보내지 않는다 — 룰 라우팅으로만 답한다.
 */
import { supabase, getDeviceId } from './supabase'
import { logEvent } from './eventLog'
import { ASK, ASK_COPY } from '../../config/listingAsk'
import { AI, canSendUserInputToModel } from '../../config/ai'
import {
  askContext, candidates, selectExamples, examplesValid, rotateExamples, FALLBACK_EXAMPLES,
  routeListingQuestion, buildAnswer, sanitizeAnswer, droppedSentences, followups,
  questionHash, clampQuestion, quotaBlocked, sourceFieldsHash, intentOf,
} from './listingAskRules'

const isProd = () => { try { return import.meta.env.PROD === true } catch (_) { return false } }
export const modelMayReadUserInput = () => canSendUserInputToModel(AI.ASK.tier, isProd())

async function currentUserId() {
  try { const { data: { session } } = await supabase.auth.getSession(); return session?.user?.id ?? null } catch (_) { return null }
}

/** 예시 문구 — 캐시 우선. 없거나 필드가 바뀌었으면 룰로 만들고 저장(모델 다듬기는 서버 배치 몫) */
export async function fetchAskExamples(listing, extra = {}, seed = Date.now()) {
  const ctx = askContext(listing, extra)
  const hash = sourceFieldsHash(listing, ctx)
  let rows = null
  try {
    const { data } = await supabase.from('listing_ask_examples').select('*').eq('target_type', 'listing').eq('target_id', listing.id).maybeSingle()
    rows = data ?? null
  } catch (_) { rows = null }
  if (rows && rows.source_fields_hash === hash && Array.isArray(rows.examples) && rows.examples.length) {
    return { examples: rotateExamples(rows.examples, seed), ctx, cached: true }
  }
  const cands = candidates(listing, ctx)
  let picked = selectExamples(cands, seed)
  if (!examplesValid(picked)) picked = picked.length >= ASK.EXAMPLES_MIN ? picked : FALLBACK_EXAMPLES
  // 캐시는 읽기만 한다 — 쓰기는 서버 배치 몫이다(방문자 브라우저가 공용 캐시를 쓰지 않는다, A3·A7)
  const examples = picked.map(({ key, axis, branch, text }) => ({ key, axis, branch, text }))
  return { examples: rotateExamples(examples, seed), ctx, cached: false }
}

/** 오늘 이 매물에 이 기기가 던진 질문 수 */
export async function askedToday(listingId) {
  try {
    const since = new Date(); since.setHours(0, 0, 0, 0)
    const { data } = await supabase.from('ask_question_events').select('id').eq('target_id', listingId).gte('created_at', since.toISOString())
    return data?.length ?? 0
  } catch (_) { return 0 }
}

/** 질문 로그 1행 — 원문 90일(서버 배치가 지움). user_id 는 저장하지 않는다(pseudonym 은 서버에서) */
async function logQuestion(listing, text, route, { answered = false, ledgerId = null } = {}) {
  try {
    await supabase.from('ask_question_events').insert({
      target_type: 'listing', target_id: listing.id, raw_text: clampQuestion(text),
      topic_axis: route.axis, intent: intentOf(route), branch: route.branch, answered, ledger_id: ledgerId,
    })
  } catch (_) {}
}

/**
 * 질문 1건 처리 — ③ 시세 / ① 답변 / ② 주인 확인.
 * @returns { branch, answer?, basis?, followups?, blocked? }
 */
export async function askQuestion(listing, text, extra = {}) {
  const q = clampQuestion(text)
  if (!q) return { branch: 'none' }
  const used = await askedToday(listing.id)
  if (quotaBlocked(used)) { logEvent('ask_quota_blocked', { listing_id: listing.id }); return { branch: 'quota', message: ASK_COPY.quota } }

  const ctx = askContext(listing, extra)
  const route = routeListingQuestion('listing', listing.id, q, ctx)
  logEvent('ask_route', { branch: route.branch })
  logEvent('ask_topic_classified', { axis: route.axis, intent: intentOf(route), branch: route.branch })

  if (route.branch === 'price') { await logQuestion(listing, q, route); logEvent('ask_to_price_inquiry', {}); return { branch: 'price' } }

  if (route.branch === 'data') {
    const hash = questionHash(q)
    let answer = null
    try {
      const { data } = await supabase.from('listing_ask_cache').select('answer').eq('target_type', 'listing').eq('target_id', listing.id).eq('question_hash', hash).maybeSingle()
      if (data?.answer?.text) answer = { ...data.answer, cached: true }
    } catch (_) {}
    if (!answer) {
      const built = buildAnswer(route.fields, ctx)
      if (built) {
        const clean = sanitizeAnswer(built.text)
        for (const s of droppedSentences(built.text)) logEvent('ask_dropped_sentence', { reason: 'forbidden', len: s.length })
        if (clean) {
          answer = { text: clean, basis: built.basis, fields: built.fields, cached: false }
          try { await supabase.from('listing_ask_cache').insert({ target_type: 'listing', target_id: listing.id, question_hash: hash, answer }) } catch (_) {}
        }
      }
    }
    if (answer) {
      await logQuestion(listing, q, route, { answered: true })
      logEvent('ask_answer_shown', { field_count: answer.fields?.length ?? 0, cached: !!answer.cached })
      const cands = candidates(listing, ctx)
      return { branch: 'data', answer, followups: followups(cands, route.axis) }
    }
    // 답을 못 만들면 "데이터가 부족해요" 류 문구 없이 곧장 ② 로 (A6)
    return { branch: 'owner', axis: route.axis, question: q }
  }
  return { branch: 'owner', axis: route.axis, question: q }
}

/**
 * ② [물어봐 주세요] — DM 을 열지 않는다. 양도인에게 질문 카드로 가고, 답이 오면 모두가 전달한다(C4).
 */
export async function sendAskToOwner(listing, question, axis) {
  const q = clampQuestion(question)
  try {
    const expires = new Date(Date.now() + ASK.OWNER_EXPIRE_DAYS * 864e5).toISOString()
    const row = {
      device_id: getDeviceId(), user_id: await currentUserId(), listing_id: listing.id,
      source: 'listing_ask', channel: 'app', status: 'sent',
      ask_question_text: q, ask_axis: axis, ask_expires_at: expires,
    }
    const { data, error } = await supabase.from('inquiry_ledger').insert(row).select('id').single()
    if (error) return { ok: false }
    await logQuestion(listing, q, { axis, branch: 'owner' }, { ledgerId: data.id })
    // 양도인 알림 — 질문자 이름·연락처 없음
    try {
      await supabase.from('notifications').insert({
        device_id: listing.device_id, user_id: listing.user_id ?? null, type: 'ask_owner_question',
        title: ASK_COPY.ownerCardTitle, body: q,
        payload: { link: `/d4/inbox?ask=${data.id}`, ledger_id: data.id, axis, dedupe_key: `ask:${data.id}` },
        sent_at: new Date().toISOString(),
      })
    } catch (_) {}
    logEvent('ask_ask_owner', { axis })
    return { ok: true, id: data.id }
  } catch (_) { return { ok: false } }
}
