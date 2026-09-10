-- ORDER 2026-09-10 찜 양방향 신호(파트 A) + 다음 행동 카드(파트 B) — 스키마 (대표 실행, 멈춤 a)
-- 전부 추가(add)만. 미실행 상태에서도 기존 기능은 깨지지 않는다(앱은 테이블·제약 부재 시 조용히 비활성).
-- 재실행 안전: if not exists / drop policy if exists.

-- ══════════════════════════════════════════════════════════════
-- [1] watchlist — 찜(관심) 3종: listing | area | vendor
-- ══════════════════════════════════════════════════════════════
-- 오더 컬럼 + device_id(신원 모델 — 기존 찜 저장소가 없어 신규). target_id 는 listing·vendor 는 listings.id,
-- area 는 법정동코드(bjd_code) 문자열. area_geom 은 오더대로 자리만(지도 그리기 기능 없음 — 미사용).
create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  device_id text not null,
  target_type text not null,             -- listing | area | vendor
  target_id text,                        -- listings.id(uuid 문자열) 또는 법정동코드
  area_geom jsonb,                       -- 자리만 (지도 범위 그리기 미구현)
  created_at timestamptz not null default now(),
  muted_at timestamptz,                  -- 알림만 끔 (찜 유지)
  constraint watchlist_type_check check (target_type in ('listing', 'area', 'vendor'))
);
create unique index if not exists watchlist_unique_idx on watchlist (device_id, target_type, target_id);
create index if not exists watchlist_target_idx on watchlist (target_type, target_id, created_at desc);

alter table watchlist enable row level security;
drop policy if exists "watchlist_select" on watchlist;
create policy "watchlist_select" on watchlist for select using (true);
drop policy if exists "watchlist_insert" on watchlist;
create policy "watchlist_insert" on watchlist for insert with check (true);
drop policy if exists "watchlist_update" on watchlist;
create policy "watchlist_update" on watchlist for update using (true);
drop policy if exists "watchlist_delete" on watchlist;
create policy "watchlist_delete" on watchlist for delete using (true); -- 찜 해제 = 행 삭제 (유일하게 삭제 허용)

-- ══════════════════════════════════════════════════════════════
-- [2] watch_notifications — 찜한 사람에게 보낸 알림 기록 (하루 상한·중복 방지 판정 재료)
-- ══════════════════════════════════════════════════════════════
create table if not exists watch_notifications (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references watchlist (id) on delete cascade,
  kind text not null,                    -- price | info | status | similar | density | owner_msg | deal_result
  notification_id uuid,                  -- notifications.id (알림 센터 행)
  sent_at timestamptz not null default now(),
  clicked_at timestamptz,
  constraint watch_notifications_kind_check check (kind in ('price', 'info', 'status', 'similar', 'density', 'owner_msg', 'deal_result'))
);
create index if not exists watch_notifications_lookup_idx on watch_notifications (watchlist_id, kind, sent_at desc);

alter table watch_notifications enable row level security;
drop policy if exists "watch_notifications_select" on watch_notifications;
create policy "watch_notifications_select" on watch_notifications for select using (true);
drop policy if exists "watch_notifications_insert" on watch_notifications;
create policy "watch_notifications_insert" on watch_notifications for insert with check (true);
drop policy if exists "watch_notifications_update" on watch_notifications;
create policy "watch_notifications_update" on watch_notifications for update using (true);

-- ══════════════════════════════════════════════════════════════
-- [3] listing_owner_messages — 양도인 '한마디'(7일 1회)·'찜한 분들께 알리기'(30일 1회) 기록
-- ══════════════════════════════════════════════════════════════
create table if not exists listing_owner_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  template_key text not null,            -- 한마디: ask_anytime | visit_time | price_negotiable / 알리기: push_price | push_info
  payload jsonb,                         -- visit_time 의 시간대 칩 값 등
  sent_at timestamptz not null default now()
);
create index if not exists listing_owner_messages_idx on listing_owner_messages (listing_id, sent_at desc);

alter table listing_owner_messages enable row level security;
drop policy if exists "listing_owner_messages_select" on listing_owner_messages;
create policy "listing_owner_messages_select" on listing_owner_messages for select using (true);
drop policy if exists "listing_owner_messages_insert" on listing_owner_messages;
create policy "listing_owner_messages_insert" on listing_owner_messages for insert with check (true);

-- ══════════════════════════════════════════════════════════════
-- [4] inquiry_ledger.source — 시세 카드 클릭(price_card) 값 추가 (파트 B1)
-- ══════════════════════════════════════════════════════════════
alter table inquiry_ledger drop constraint if exists inquiry_ledger_source_check;
alter table inquiry_ledger add constraint inquiry_ledger_source_check
  check (source in ('sales_card', 'vendor_profile', 'demand_signal', 'price_card', 'other'));

-- ══════════════════════════════════════════════════════════════
-- [5] 알림 종류별 끄기 — profiles.profile_data.roleData 안에 저장(컬럼 추가 없음). 스키마 변경 없음.
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- [6] 검증
-- ══════════════════════════════════════════════════════════════
select count(*) as watchlist from watchlist;                         -- 0
select count(*) as watch_notifications from watch_notifications;     -- 0
select count(*) as listing_owner_messages from listing_owner_messages; -- 0
select pg_get_constraintdef(oid) from pg_constraint where conname = 'inquiry_ledger_source_check'; -- price_card 포함
