-- ORDER 2026-09-12 후기 규칙(A2) + 매물 quiet 공개 단계(B1) + 기업회원 '함께 일한 사장님 한마디'(C1) — 스키마 (대표 실행, 멈춤 a)
-- 전부 추가(add)만. 미실행 상태에서도 기존 기능은 깨지지 않는다(앱은 부재 시 해당 기능만 조용히 비활성).
-- 재실행 안전: if not exists / drop policy if exists / create or replace view.
-- 원칙(A1): 매물에 대한 평가는 없다. 매물 후기 = "가서 본 것", 기업회원 후기 = "맡겨 본 것". 별점·점수·좋아요·추천 컬럼 없음.

-- ══════════════════════════════════════════════════════════════
-- [A2] reviews · review_appeals
-- ══════════════════════════════════════════════════════════════
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,             -- listing | vendor
  target_id uuid not null,
  author_user_id uuid not null,          -- 로그인 회원만
  author_axis text not null,             -- prep | owner | seller | vendor
  author_name varchar(20),               -- 작성 시점 닉네임 스냅샷 (표시용 — 오더 컬럼 외 추가)
  chips jsonb not null default '{}'::jsonb,
  body varchar(200),
  visited_at timestamptz,                -- 매물 후기만: 방문 시간대 칩에서 유도
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text,                       -- owner | seller | author | ops
  blinded_until timestamptz,
  blind_reason text,                     -- vendor_appeal
  constraint reviews_target_check check (target_type in ('listing', 'vendor')),
  constraint reviews_axis_check check (author_axis in ('prep', 'owner', 'seller', 'vendor')),
  constraint reviews_deleted_by_check check (deleted_by is null or deleted_by in ('owner', 'seller', 'author', 'ops')),
  constraint reviews_blind_reason_check check (blind_reason is null or blind_reason in ('vendor_appeal')),
  unique (target_type, target_id, author_user_id)  -- 같은 사용자·같은 대상 1건
);
create index if not exists reviews_target_idx on reviews (target_type, target_id, deleted_at, blinded_until);
create index if not exists reviews_author_idx on reviews (author_user_id, created_at desc);

create table if not exists review_appeals (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews (id) on delete cascade,
  vendor_user_id uuid not null,
  reason_chip text not null,             -- not_customer | false_claim | coercion | other
  note varchar(200),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text,                       -- keep | remove
  resolved_by text,                      -- ops | auto
  constraint review_appeals_reason_check check (reason_chip in ('not_customer', 'false_claim', 'coercion', 'other')),
  constraint review_appeals_resolution_check check (resolution is null or resolution in ('keep', 'remove')),
  unique (review_id)                     -- 후기당 이의신청 1회
);

alter table reviews enable row level security;
alter table review_appeals enable row level security;
drop policy if exists "reviews_select" on reviews;
create policy "reviews_select" on reviews for select using (auth.uid() is not null); -- 열람도 로그인 회원만
drop policy if exists "reviews_insert" on reviews;
create policy "reviews_insert" on reviews for insert with check (auth.uid() = author_user_id);
drop policy if exists "reviews_update" on reviews;
create policy "reviews_update" on reviews for update using (true); -- soft 삭제·블라인드·자동 복구(크론 anon 키). 소유 판정은 앱(울타리 수준, 다른 테이블과 동일)
drop policy if exists "review_appeals_select" on review_appeals;
create policy "review_appeals_select" on review_appeals for select using (auth.uid() is not null);
drop policy if exists "review_appeals_insert" on review_appeals;
create policy "review_appeals_insert" on review_appeals for insert with check (auth.uid() = vendor_user_id);
drop policy if exists "review_appeals_update" on review_appeals;
create policy "review_appeals_update" on review_appeals for update using (true); -- 운영 판정·만료 자동 keep(크론)
-- DELETE 정책 없음 = 하드 삭제 차단 (soft delete 만)

-- ══════════════════════════════════════════════════════════════
-- [B1] listings quiet 공개 단계 + listing_reveals + inquiry_ledger.stage + 서버 마스킹 뷰
-- ══════════════════════════════════════════════════════════════
alter table listings add column if not exists visibility text not null default 'public';
alter table listings add column if not exists quiet_started_at timestamptz;
alter table listings add column if not exists quiet_deadline_at timestamptz;
alter table listings add column if not exists ai_draft_masked jsonb;  -- quiet 용 소개글(룰 치환본). ai_draft 는 항상 full
alter table listings drop constraint if exists listings_visibility_check;
alter table listings add constraint listings_visibility_check check (visibility in ('public', 'quiet'));
-- published_at 은 이미 있음(close-flow SQL) — public 전환 시각으로 그대로 사용

create table if not exists listing_reveals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  revealed_to_user_id uuid,              -- 문의자 계정(있을 때)
  revealed_to_device_id text,            -- 문의자 기기 — 대화(conversations)는 기기 기준이라 이 값으로 공개 판정
  revealed_at timestamptz not null default now(),
  via text not null default 'inquiry',
  constraint listing_reveals_via_check check (via in ('inquiry')),
  constraint listing_reveals_target_check check (revealed_to_user_id is not null or revealed_to_device_id is not null)
);
create unique index if not exists listing_reveals_device_idx on listing_reveals (listing_id, revealed_to_device_id) where revealed_to_device_id is not null;
create unique index if not exists listing_reveals_user_idx on listing_reveals (listing_id, revealed_to_user_id) where revealed_to_user_id is not null;
alter table listing_reveals enable row level security;
drop policy if exists "listing_reveals_select" on listing_reveals;
create policy "listing_reveals_select" on listing_reveals for select using (true);
drop policy if exists "listing_reveals_insert" on listing_reveals;
create policy "listing_reveals_insert" on listing_reveals for insert with check (true);

alter table inquiry_ledger add column if not exists stage text not null default 'public';
alter table inquiry_ledger drop constraint if exists inquiry_ledger_stage_check;
alter table inquiry_ledger add constraint inquiry_ledger_stage_check check (stage in ('public', 'quiet'));

-- 서버(DB) 마스킹 뷰 — 방문자 읽기 경로(탐색·피드·상세·비교)는 이 뷰를 읽는다. 클라이언트 숨김이 아니라 응답 자체에 값이 없다.
-- 예외: 소유자(user_id = auth.uid() 또는 device_id = 요청 헤더 x-device-id) 와 개별 공개(listing_reveals: 계정 또는 기기) 받은 사용자.
create or replace view listings_visible with (security_invoker = true) as
select
  l.id, l.device_id, l.user_id, l.listing_type, l.status, l.visibility, l.quiet_started_at, l.quiet_deadline_at, l.published_at,
  l.created_at, l.updated_at,
  case when m.masked then null else l.shop_name end                                   as shop_name,
  case when m.masked then false else l.shop_name_public end                           as shop_name_public,
  case when m.masked then null else l.title end                                       as title,
  case when m.masked then regexp_replace(coalesce(l.address, ''), '^((\S+\s+){0,2}\S+(동|읍|면|리|가)\d*).*$', '\1') else l.address end as address,
  case when m.masked then null else l.address_detail end                              as address_detail,
  case when m.masked then null else l.building_name end                               as building_name,
  case when m.masked then null else l.postal_code end                                 as postal_code,
  l.bjd_code,
  case when m.masked then null else l.latitude end                                    as latitude,
  case when m.masked then null else l.longitude end                                   as longitude,
  case when m.masked then '[]'::jsonb else to_jsonb(l.image_urls) end                 as image_urls,
  case when m.masked then '[]'::jsonb else to_jsonb(l.interior_image_urls) end        as interior_image_urls,
  case when m.masked then '[]'::jsonb else to_jsonb(l.exterior_image_urls) end        as exterior_image_urls,
  l.photos_added, l.extras, l.rights_info, l.available_from, l.main_purpose, l.use_approval_date, l.business_region,
  l.floor, l.area, l.deposit, l.monthly_rent, l.maintenance, l.transfer_fee, l.transfer_type, l.monthly_sales, l.sales_proof,
  l.biz_type, l.category_main, l.category_sub, l.ksic_code, l.is_franchise,
  case when m.masked then null else l.franchise_brand_name end                        as franchise_brand_name,
  case when m.masked then null else l.franchise_brand_id end                          as franchise_brand_id,
  case when m.masked then coalesce(l.ai_draft_masked, '{}'::jsonb) else l.ai_draft end as ai_draft,
  case when m.masked then '{}'::jsonb else l.edited_texts end                         as edited_texts,
  l.review_choices, l.item_visibility, l.facilities, l.facility_age,
  l.spot_frontage, l.spot_parking, l.spot_visibility,
  case when m.masked then null else l.autofill end                                    as autofill,
  l.owner_nickname, l.views, l.deal_type, l.sale_price, l.cap_rate, l.occupancy, l.recommended_biz,
  l.interior_state, l.remaining_facilities, l.prev_biz, l.building_facilities, l.show_map,
  l.biz_tagline, l.biz_tags, l.biz_category, l.biz_phone
from listings l
cross join lateral (
  -- 요청 헤더 x-device-id(앱 클라이언트가 항상 보냄) 로 기기 기준 소유자·개별 공개도 판정한다
  select (l.visibility = 'quiet'
          and not (l.user_id is not null and l.user_id = auth.uid())
          and not (l.device_id is not null and l.device_id = current_setting('request.headers', true)::json->>'x-device-id')
          and not exists (select 1 from listing_reveals r where r.listing_id = l.id
                          and (r.revealed_to_user_id = auth.uid()
                               or r.revealed_to_device_id = current_setting('request.headers', true)::json->>'x-device-id'))) as masked
) m;
grant select on listings_visible to anon, authenticated;

-- ══════════════════════════════════════════════════════════════
-- [C1] vendor_take_invites · vendor_takes (기업회원 프로필 전용 — target_type 없음)
-- ══════════════════════════════════════════════════════════════
create table if not exists vendor_take_invites (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null,
  vendor_id uuid,                        -- listings.id (listing_type='business') — 링크 페이지 업체명 표시용
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_responses integer not null default 5,
  response_count integer not null default 0,
  closed_at timestamptz
);
create table if not exists vendor_takes (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references vendor_take_invites (id) on delete cascade,
  vendor_user_id uuid not null,
  display_name varchar(20) not null,
  business_type varchar(20),
  chip text not null,                    -- 중개 | 인테리어 | 세무 | 간판 | 시설 | 기타
  body varchar(150),
  voice_url text,                        -- 30초 상한(클라이언트 검증)
  voice_sec integer,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  position integer,                      -- 1~3
  removed_at timestamptz,
  constraint vendor_takes_chip_check check (chip in ('중개', '인테리어', '세무', '간판', '시설', '기타')),
  constraint vendor_takes_position_check check (position is null or position between 1 and 3)
);
create index if not exists vendor_takes_vendor_idx on vendor_takes (vendor_user_id, approved_at, position);

alter table vendor_take_invites enable row level security;
alter table vendor_takes enable row level security;
drop policy if exists "vendor_take_invites_select" on vendor_take_invites;
create policy "vendor_take_invites_select" on vendor_take_invites for select using (true);   -- 링크 페이지(비회원)가 token 으로 읽는다
drop policy if exists "vendor_take_invites_insert" on vendor_take_invites;
create policy "vendor_take_invites_insert" on vendor_take_invites for insert with check (auth.uid() = vendor_user_id);
drop policy if exists "vendor_take_invites_update" on vendor_take_invites;
create policy "vendor_take_invites_update" on vendor_take_invites for update using (true);
drop policy if exists "vendor_takes_select" on vendor_takes;
create policy "vendor_takes_select" on vendor_takes for select using (true);
drop policy if exists "vendor_takes_insert" on vendor_takes;
create policy "vendor_takes_insert" on vendor_takes for insert with check (true);            -- 비회원 응답 (require_login_for_take=false)
drop policy if exists "vendor_takes_update" on vendor_takes;
create policy "vendor_takes_update" on vendor_takes for update using (auth.uid() = vendor_user_id);

-- ══════════════════════════════════════════════════════════════
-- [검증]
-- ══════════════════════════════════════════════════════════════
select
  (select count(*) from reviews) as reviews,
  (select count(*) from review_appeals) as review_appeals,
  (select count(*) from listing_reveals) as listing_reveals,
  (select count(*) from vendor_take_invites) as vendor_take_invites,
  (select count(*) from vendor_takes) as vendor_takes,
  (select count(*) from listings_visible where visibility = 'public') as visible_public,
  (select count(*) from information_schema.columns where table_name = 'listings' and column_name in ('visibility', 'quiet_started_at', 'quiet_deadline_at', 'ai_draft_masked')) as listing_cols, -- 4
  (select count(*) from information_schema.columns where table_name = 'inquiry_ledger' and column_name = 'stage') as ledger_stage;      -- 1
