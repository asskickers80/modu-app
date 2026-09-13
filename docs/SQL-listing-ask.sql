-- ORDER 2026-09-13 모두에 질문하기(A1) + 기업회원 갱신 리포트(B1) + 질문 로그 2단 보관(C1) — 스키마 (대표 실행, 멈춤 a)
-- 전부 추가(add)만. 미실행 상태에서도 기존 화면은 그대로 동작한다(질문 섹션·리포트만 조용히 비활성).
-- 재실행 안전: if not exists / drop constraint if exists / drop policy if exists.
-- 원칙: 원문은 90일, 집계는 영구. user_id 직접 저장 금지(pseudonym_id = 90일 회전 해시). 임베딩·벡터 저장 없음.

-- ══════════════════════════════════════════════════════════════
-- [A1] inquiry_ledger 확장 — 질문에서 생긴 문의(② 파이프라인 상태를 이 행이 들고 있다)
-- ══════════════════════════════════════════════════════════════
alter table inquiry_ledger drop constraint if exists inquiry_ledger_source_check;
alter table inquiry_ledger add constraint inquiry_ledger_source_check
  check (source in ('sales_card', 'vendor_profile', 'demand_signal', 'price_card', 'price_inquiry', 'listing_ask', 'other'));
alter table inquiry_ledger drop constraint if exists inquiry_ledger_status_check;
alter table inquiry_ledger add constraint inquiry_ledger_status_check
  check (status in ('sent', 'replied', 'opened', 'closed'));
alter table inquiry_ledger add column if not exists listing_id uuid;                -- 질문 대상 매물 (② 카드 배달 대상)
alter table inquiry_ledger add column if not exists ask_question_text varchar(200); -- ② 원 질문 문장
alter table inquiry_ledger add column if not exists ask_owner_reply_text text;      -- 양도인 답장 원문 — 내부 전용·90일 후 NULL (C2)
alter table inquiry_ledger add column if not exists ask_axis text;                  -- 질문 축 (집계 재료)
alter table inquiry_ledger add column if not exists ask_replied_at timestamptz;
alter table inquiry_ledger add column if not exists ask_relayed_at timestamptz;
alter table inquiry_ledger add column if not exists ask_expires_at timestamptz;
alter table inquiry_ledger add column if not exists ask_reminded_at timestamptz;
create index if not exists inquiry_ledger_ask_idx on inquiry_ledger (source, listing_id, status, created_at desc);

-- ══════════════════════════════════════════════════════════════
-- [A1] 매물별 예시·답변 캐시 (조회당 모델 호출 0)
-- ══════════════════════════════════════════════════════════════
create table if not exists listing_ask_examples (
  id uuid primary key default gen_random_uuid(),
  target_type text not null default 'listing',   -- listing | shop
  target_id uuid not null,
  examples jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  source_fields_hash text,                       -- 매물 필드가 바뀌면 무효화
  constraint listing_ask_examples_target_check check (target_type in ('listing', 'shop')),
  unique (target_type, target_id)
);
create table if not exists listing_ask_cache (
  id uuid primary key default gen_random_uuid(),
  target_type text not null default 'listing',
  target_id uuid not null,
  question_hash text not null,
  answer jsonb not null,
  created_at timestamptz not null default now(),
  constraint listing_ask_cache_target_check check (target_type in ('listing', 'shop')),
  unique (target_type, target_id, question_hash)
);
alter table listing_ask_examples enable row level security;
alter table listing_ask_cache enable row level security;
do $$ declare t text; begin
  foreach t in array array['listing_ask_examples', 'listing_ask_cache'] loop
    execute format('drop policy if exists "%1$s_select" on %1$s', t);
    execute format('create policy "%1$s_select" on %1$s for select using (true)', t);
    execute format('drop policy if exists "%1$s_insert" on %1$s', t);
    execute format('create policy "%1$s_insert" on %1$s for insert with check (true)', t);
    execute format('drop policy if exists "%1$s_update" on %1$s', t);
    execute format('create policy "%1$s_update" on %1$s for update using (true)', t);
  end loop;
end $$;

-- ══════════════════════════════════════════════════════════════
-- [B1] 기업회원 입점 구독 — 갱신율 지표의 재료 (지금은 이 테이블이 없어 갱신 개념 자체가 없었다)
-- ══════════════════════════════════════════════════════════════
create table if not exists vendor_subscriptions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,                 -- listings.id (listing_type='business')
  vendor_user_id uuid,
  tier text not null default 'vendor_free',-- vendor_free | vendor_paid  (config/plans.ts)
  started_at timestamptz not null default now(),
  renews_at timestamptz,                   -- 다음 갱신일 — D-7 리포트·D-14 운영 목록 기준
  renewed_count integer not null default 0,
  canceled_at timestamptz,
  cancel_reason_chip text,
  last_report_sent_at timestamptz,         -- D-7 리포트 1회 발송 보장
  constraint vendor_subscriptions_tier_check check (tier in ('vendor_free', 'vendor_paid')),
  unique (vendor_id)
);
create index if not exists vendor_subscriptions_renew_idx on vendor_subscriptions (tier, renews_at);
alter table vendor_subscriptions enable row level security;
drop policy if exists "vendor_subscriptions_select" on vendor_subscriptions;
create policy "vendor_subscriptions_select" on vendor_subscriptions for select using (true);
drop policy if exists "vendor_subscriptions_insert" on vendor_subscriptions;
create policy "vendor_subscriptions_insert" on vendor_subscriptions for insert with check (true);
drop policy if exists "vendor_subscriptions_update" on vendor_subscriptions;
create policy "vendor_subscriptions_update" on vendor_subscriptions for update using (true);

-- ══════════════════════════════════════════════════════════════
-- [C1] 질문 로그 2단 — 원문 90일(events) / 집계 영구(facts)
-- ══════════════════════════════════════════════════════════════
create table if not exists ask_question_events (
  id uuid primary key default gen_random_uuid(),
  pseudonym_id text,                       -- user_id 의 90일 회전 해시(서버 솔트). user_id 직접 저장 금지
  target_type text not null default 'listing',
  target_id uuid not null,
  raw_text varchar(200),                   -- 90일 후 NULL
  topic_axis text not null default 'other',-- trade|area|hours|delivery|labor|facility|contract|price|other
  intent text not null default 'fact',     -- fact | compare | owner_only
  branch text not null default 'data',     -- data | owner | price
  answered boolean not null default false,
  ledger_id uuid,                          -- ② 로 이어진 inquiry_ledger 행 (전환 판정 재료)
  created_at timestamptz not null default now(),
  constraint ask_events_axis_check check (topic_axis in ('trade', 'area', 'hours', 'delivery', 'labor', 'facility', 'contract', 'price', 'other')),
  constraint ask_events_intent_check check (intent in ('fact', 'compare', 'owner_only')),
  constraint ask_events_branch_check check (branch in ('data', 'owner', 'price'))
);
create index if not exists ask_question_events_idx on ask_question_events (created_at desc);
create index if not exists ask_question_events_axis_idx on ask_question_events (topic_axis, created_at desc);

create table if not exists ask_question_facts (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  topic_axis text not null,
  intent text not null,
  branch text not null,
  industry_code text,
  region_code text,
  listing_floor_band text,
  listing_area_band text,
  listing_age_band text,
  answered boolean not null default false,
  converted_to_inquiry boolean not null default false,
  converted_to_price_inquiry boolean not null default false,
  owner_replied boolean not null default false,
  owner_reply_hours_band text not null default 'none',  -- lt6|lt24|lt72|ge72|none
  opened_to_dm boolean not null default false,
  count integer not null default 0,
  constraint ask_facts_hours_check check (owner_reply_hours_band in ('lt6', 'lt24', 'lt72', 'ge72', 'none')),
  unique (month, topic_axis, intent, branch, industry_code, region_code, listing_floor_band, listing_area_band, listing_age_band,
          answered, converted_to_inquiry, converted_to_price_inquiry, owner_replied, owner_reply_hours_band, opened_to_dm)
);
create index if not exists ask_question_facts_month_idx on ask_question_facts (month desc, topic_axis);

alter table ask_question_events enable row level security;
alter table ask_question_facts enable row level security;
do $$ declare t text; begin
  foreach t in array array['ask_question_events', 'ask_question_facts'] loop
    execute format('drop policy if exists "%1$s_select" on %1$s', t);
    execute format('create policy "%1$s_select" on %1$s for select using (true)', t);
    execute format('drop policy if exists "%1$s_insert" on %1$s', t);
    execute format('create policy "%1$s_insert" on %1$s for insert with check (true)', t);
    execute format('drop policy if exists "%1$s_update" on %1$s', t);
    execute format('create policy "%1$s_update" on %1$s for update using (true)', t);
  end loop;
end $$;

-- ══════════════════════════════════════════════════════════════
-- [검증]
-- ══════════════════════════════════════════════════════════════
select
  (select count(*) from listing_ask_examples) as ask_examples,
  (select count(*) from listing_ask_cache) as ask_cache,
  (select count(*) from vendor_subscriptions) as vendor_subs,
  (select count(*) from ask_question_events) as ask_events,
  (select count(*) from ask_question_facts) as ask_facts,
  (select count(*) from information_schema.columns where table_name = 'inquiry_ledger'
     and column_name in ('listing_id', 'ask_question_text', 'ask_owner_reply_text', 'ask_axis', 'ask_replied_at', 'ask_relayed_at', 'ask_expires_at', 'ask_reminded_at')) as ledger_ask_cols,
  (select position('listing_ask' in pg_get_constraintdef(oid)) > 0 from pg_constraint where conname = 'inquiry_ledger_source_check') as source_has_listing_ask,
  (select position('opened' in pg_get_constraintdef(oid)) > 0 from pg_constraint where conname = 'inquiry_ledger_status_check') as status_has_opened;
