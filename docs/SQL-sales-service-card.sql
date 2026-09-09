-- ORDER 2026-09-09 사장님 매출 분석 서비스 카드 + 기업회원 문의 채널 이원화 — 스키마 (대표 실행, 멈춤 a)
-- 전부 추가(add)만 — 미실행 상태에서도 기존 기능은 깨지지 않는다(앱은 테이블·컬럼 부재 시 조용히 비활성).
-- 재실행 안전: if not exists / drop policy if exists.

-- ══════════════════════════════════════════════════════════════
-- [1] daily_sales.source — 매출 출처 (판정에는 쓰지 않고 카드 근거 줄에만 사용)
-- ══════════════════════════════════════════════════════════════
alter table daily_sales add column if not exists source text not null default 'manual';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'daily_sales_source_check') then
    alter table daily_sales add constraint daily_sales_source_check
      check (source in ('manual', 'photo', 'crefia_api', 'mydata'));
  end if;
end $$;
update daily_sales set source = 'manual' where source is null; -- 기존 행 (default로 이미 manual — 방어)

-- ══════════════════════════════════════════════════════════════
-- [2] inquiry_ledger — 문의 원장 (기존 문의 원장 테이블 없음 → 신규)
-- ══════════════════════════════════════════════════════════════
-- 오더 컬럼 + 두 개 추가: device_id(신원 모델 — 비로그인도 기록), conversation_id(문의함 라벨·상태 칩 연결).
create table if not exists inquiry_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  device_id text not null,
  vendor_id uuid,                        -- 기업회원 listings.id (listing_type='business'), nullable
  conversation_id uuid,                  -- 앱 내 문의(channel=app)면 conversations.id
  source text not null,                  -- sales_card | vendor_profile | demand_signal | other
  signal text,                           -- sales_card 출처일 때 상황 키
  category text,                         -- config/salesCardCategories.ts 키
  channel text not null,                 -- app | phone
  status text not null default 'sent',   -- sent | replied | closed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiry_ledger_source_check check (source in ('sales_card', 'vendor_profile', 'demand_signal', 'other')),
  constraint inquiry_ledger_channel_check check (channel in ('app', 'phone')),
  constraint inquiry_ledger_status_check check (status in ('sent', 'replied', 'closed'))
);
create index if not exists inquiry_ledger_vendor_idx on inquiry_ledger (vendor_id, created_at desc);
create index if not exists inquiry_ledger_conversation_idx on inquiry_ledger (conversation_id);

alter table inquiry_ledger enable row level security;
drop policy if exists "inquiry_ledger_select" on inquiry_ledger;
create policy "inquiry_ledger_select" on inquiry_ledger for select using (true);
drop policy if exists "inquiry_ledger_insert" on inquiry_ledger;
create policy "inquiry_ledger_insert" on inquiry_ledger for insert with check (true);
drop policy if exists "inquiry_ledger_update" on inquiry_ledger;
create policy "inquiry_ledger_update" on inquiry_ledger for update using (true);
-- DELETE 정책 없음 = 원장 불변 (daily_sales·events와 같은 울타리 수준)

-- ══════════════════════════════════════════════════════════════
-- [3] sales_card_impressions — 카드 노출 이력 (30일 1회·닫기 30일 숨김)
-- ══════════════════════════════════════════════════════════════
create table if not exists sales_card_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  device_id text not null,
  signal text not null,                  -- lease_end_near | sales_drop | weekday_gap
  shown_at timestamptz not null default now(),
  dismissed_at timestamptz
);
create index if not exists sales_card_impressions_lookup_idx on sales_card_impressions (device_id, signal, shown_at desc);

alter table sales_card_impressions enable row level security;
drop policy if exists "sales_card_impressions_select" on sales_card_impressions;
create policy "sales_card_impressions_select" on sales_card_impressions for select using (true);
drop policy if exists "sales_card_impressions_insert" on sales_card_impressions;
create policy "sales_card_impressions_insert" on sales_card_impressions for insert with check (true);
drop policy if exists "sales_card_impressions_update" on sales_card_impressions;
create policy "sales_card_impressions_update" on sales_card_impressions for update using (true);

-- ══════════════════════════════════════════════════════════════
-- [4] listings — 기업회원 카테고리·전화번호 (파트 A4 칩 조회·파트 B3 [전화하기] 조건)
-- ══════════════════════════════════════════════════════════════
-- 기업회원 축(E1b)은 아직 저장이 없어 지금은 전부 NULL — 저장이 붙는 순간 칩·[전화하기]가 켜진다.
-- 지역은 새 컬럼 없이 기존 address(시/구)로 매칭한다.
alter table listings add column if not exists biz_category text;  -- config/salesCardCategories.ts 키 (marketing 등)
alter table listings add column if not exists biz_phone text;     -- 기업회원이 직접 등록한 번호만. 없으면 [전화하기] 미렌더

-- ══════════════════════════════════════════════════════════════
-- [5] 검증
-- ══════════════════════════════════════════════════════════════
select count(*) filter (where source = 'manual') as manual_rows, count(*) as total from daily_sales; -- 둘이 같아야 함
select count(*) as inquiry_ledger from inquiry_ledger;                 -- 0
select count(*) as sales_card_impressions from sales_card_impressions; -- 0
select column_name from information_schema.columns
where table_name = 'listings' and column_name in ('biz_category', 'biz_phone'); -- 2 rows
