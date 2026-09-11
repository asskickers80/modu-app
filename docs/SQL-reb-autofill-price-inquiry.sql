-- ORDER 2026-09-11 부동산원 비교선(A1) + 자동 채움 출처(B1) + 모두에 시세 물어보기(C1) — 스키마 (대표 실행, 멈춤 a)
-- 전부 추가(add)만. 미실행 상태에서도 기존 기능은 깨지지 않는다(앱은 부재 시 해당 기능만 조용히 비활성).
-- 재실행 안전: if not exists / drop policy if exists.
-- 원칙: 외부 API 응답 원본은 어디에도 저장하지 않는다 — 아래 컬럼은 전부 가공값·사용자 확정값뿐.

-- ══════════════════════════════════════════════════════════════
-- [A1] reb_market_stats — 한국부동산원 상업용부동산 임대동향 (분기 1회 배치가 채움)
-- ══════════════════════════════════════════════════════════════
create table if not exists reb_market_stats (
  id uuid primary key default gen_random_uuid(),
  quarter text not null,                 -- 'YYYYQn'
  region_level text not null,            -- sido | sigungu | district
  region_code text,                      -- 시군구 코드(법정동 앞 5자리) 등. district 는 부동산원 상권명 기준이라 null 가능
  region_name text not null,
  store_type text not null,              -- small | medium_large | aggregate
  vacancy_rate numeric,                  -- 공실률 %
  rent_per_m2 integer,                   -- ㎡당 임대료(원)
  rent_index_change numeric,             -- 임대가격지수 전분기 대비 변동률 %
  source_url text,
  fetched_at timestamptz not null default now(),
  constraint reb_market_stats_level_check check (region_level in ('sido', 'sigungu', 'district')),
  constraint reb_market_stats_type_check check (store_type in ('small', 'medium_large', 'aggregate')),
  unique (quarter, region_level, region_name, store_type)
);
create index if not exists reb_market_stats_lookup_idx on reb_market_stats (region_level, region_code, store_type, quarter desc);

alter table reb_market_stats enable row level security;
drop policy if exists "reb_market_stats_select" on reb_market_stats;
create policy "reb_market_stats_select" on reb_market_stats for select using (true);
drop policy if exists "reb_market_stats_insert" on reb_market_stats;
create policy "reb_market_stats_insert" on reb_market_stats for insert with check (true);
drop policy if exists "reb_market_stats_update" on reb_market_stats;
create policy "reb_market_stats_update" on reb_market_stats for update using (true);

-- ══════════════════════════════════════════════════════════════
-- [B1] listing_field_sources — 자동 채움 필드별 출처·확정 상태 (매물·상가·기업회원 공용)
-- ══════════════════════════════════════════════════════════════
create table if not exists listing_field_sources (
  id uuid primary key default gen_random_uuid(),
  target_type text not null default 'listing',   -- listing | vendor
  listing_id uuid not null,
  field text not null,                            -- categoryMain | address | floor | area | buildingYear | photos | ...
  source text not null,                           -- naver_local | sbiz | building_ledger | kakao_local | roadview | user
  status text not null default 'auto',            -- auto | user_confirmed | user_edited
  updated_at timestamptz not null default now(),
  constraint listing_field_sources_source_check check (source in ('naver_local', 'sbiz', 'building_ledger', 'kakao_local', 'roadview', 'user')),
  constraint listing_field_sources_status_check check (status in ('auto', 'user_confirmed', 'user_edited')),
  unique (target_type, listing_id, field)
);
create index if not exists listing_field_sources_listing_idx on listing_field_sources (listing_id);

alter table listing_field_sources enable row level security;
drop policy if exists "listing_field_sources_select" on listing_field_sources;
create policy "listing_field_sources_select" on listing_field_sources for select using (true);
drop policy if exists "listing_field_sources_insert" on listing_field_sources;
create policy "listing_field_sources_insert" on listing_field_sources for insert with check (true);
drop policy if exists "listing_field_sources_update" on listing_field_sources;
create policy "listing_field_sources_update" on listing_field_sources for update using (true);

-- ══════════════════════════════════════════════════════════════
-- [C1] 모두에 시세 물어보기 — 수요 신호(지시문 E 테이블이 없어 신규) + 응답 + 피드백 + 원장 컬럼
-- ══════════════════════════════════════════════════════════════
-- 지시문 E(demand_signals·dispatchDemandSignal·dm_threads)는 저장소에 구현체가 없다. 이 오더가 첫 구현이며
-- topic_key 는 price_check 로 시작하고 다른 주제는 뒤에 붙인다. attachment 에 이름·연락처·매출 금액·정확한 주소 없음.
create table if not exists demand_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  device_id text not null,
  topic_key text not null,               -- price_check | ...
  origin text,                           -- sales_card | seller_onboarding | owner_card | listing_manage
  attachment jsonb,                      -- { industry, dong, area_band, floor, rent_band, sales_band?, chips[], timing }
  place_hash text,                       -- 같은 점포 판정용(주소 해시) — 30일 1회
  region_gu text,                        -- 배정용 구
  latitude double precision, longitude double precision,
  status text not null default 'open',   -- open | answered | expired
  target_count integer not null default 0,
  pending boolean not null default false, -- 대상 0곳 → 영업 리스트
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint demand_signals_topic_check check (topic_key in ('price_check')),
  constraint demand_signals_status_check check (status in ('open', 'answered', 'expired'))
);
create index if not exists demand_signals_user_idx on demand_signals (device_id, created_at desc);
create index if not exists demand_signals_dedupe_idx on demand_signals (device_id, place_hash, created_at desc);

create table if not exists demand_signal_targets (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references demand_signals (id) on delete cascade,
  vendor_id uuid not null,               -- listings.id (listing_type='business')
  vendor_device_id text,
  assignee_type text not null default 'vendor', -- vendor | modu  (§1-1: 모두 법인도 같은 규칙, 우선 발송 없음)
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  response_text text,                    -- 기본 문장(200자 이내)
  declined_at timestamptz,               -- 사용자가 [괜찮아요]
  conversation_id uuid,                  -- [대화 열기] 뒤에만 채워진다
  constraint demand_signal_targets_assignee_check check (assignee_type in ('vendor', 'modu')),
  unique (signal_id, vendor_id)
);
create index if not exists demand_signal_targets_vendor_idx on demand_signal_targets (vendor_id, sent_at desc);

create table if not exists price_inquiry_feedback (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references demand_signals (id) on delete cascade,
  user_id uuid,
  device_id text not null,
  result text not null,                  -- helped | not_yet | no_contact
  created_at timestamptz not null default now(),
  constraint price_inquiry_feedback_result_check check (result in ('helped', 'not_yet', 'no_contact')),
  unique (signal_id, device_id)
);

alter table demand_signals enable row level security;
alter table demand_signal_targets enable row level security;
alter table price_inquiry_feedback enable row level security;
do $$ declare t text; begin
  foreach t in array array['demand_signals', 'demand_signal_targets', 'price_inquiry_feedback'] loop
    execute format('drop policy if exists "%1$s_select" on %1$s', t);
    execute format('create policy "%1$s_select" on %1$s for select using (true)', t);
    execute format('drop policy if exists "%1$s_insert" on %1$s', t);
    execute format('create policy "%1$s_insert" on %1$s for insert with check (true)', t);
    execute format('drop policy if exists "%1$s_update" on %1$s', t);
    execute format('create policy "%1$s_update" on %1$s for update using (true)', t);
  end loop;
end $$;

-- inquiry_ledger 확장: 시세 문의 출처·배정 주체·신호 연결
alter table inquiry_ledger add column if not exists assignee_type text not null default 'vendor';
alter table inquiry_ledger add column if not exists price_inquiry_id uuid;
alter table inquiry_ledger drop constraint if exists inquiry_ledger_source_check;
alter table inquiry_ledger add constraint inquiry_ledger_source_check
  check (source in ('sales_card', 'vendor_profile', 'demand_signal', 'price_card', 'price_inquiry', 'other'));
alter table inquiry_ledger drop constraint if exists inquiry_ledger_assignee_check;
alter table inquiry_ledger add constraint inquiry_ledger_assignee_check check (assignee_type in ('vendor', 'modu'));

-- ══════════════════════════════════════════════════════════════
-- [검증]
-- ══════════════════════════════════════════════════════════════
select count(*) as reb_market_stats from reb_market_stats;               -- 0
select count(*) as listing_field_sources from listing_field_sources;     -- 0
select count(*) as demand_signals from demand_signals;                   -- 0
select column_name from information_schema.columns
where table_name = 'inquiry_ledger' and column_name in ('assignee_type', 'price_inquiry_id', 'region'); -- 3 rows
