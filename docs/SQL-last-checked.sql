-- ORDER 2026-09-15 후속 조각 — 최근 확인일 (대표 실행, 멈춤 a)
-- 컬럼 1개 추가만. 미실행 상태에서도 기존 기능은 그대로 동작한다
-- (앱은 저장 실패를 조용히 삼키고, 확인일 줄은 나오지 않는다 — 판매자 우선 규칙상 등록일로 대체하지 않는다).
-- 재실행 안전: if not exists.

alter table listings add column if not exists last_checked_at timestamptz;

-- 방문자 목록·상세가 함께 읽는 값이라 정렬·필터에는 쓰지 않는다(정렬 키 금지 — 노출 규칙은 PRICING §1-1)
create index if not exists listings_last_checked_idx on listings (last_checked_at desc);

-- 방문자 읽기 경로는 마스킹 뷰를 읽는다 — 뷰에 컬럼을 넣지 않으면 확인일이 보이지 않는다.
-- 아래는 2026-09-12 뷰 정의에 last_checked_at 한 줄만 더한 것이다(다른 컬럼·마스킹 규칙 변경 없음).
create or replace view listings_visible with (security_invoker = true) as
select
  l.id, l.device_id, l.user_id, l.listing_type, l.status, l.visibility, l.quiet_started_at, l.quiet_deadline_at, l.published_at,
  l.created_at, l.updated_at, l.last_checked_at,
  case when m.masked then null else l.shop_name end                                   as shop_name,
  case when m.masked then false else l.shop_name_public end                           as shop_name_public,
  case when m.masked then null else l.title end                                       as title,
  case when m.masked then regexp_replace(coalesce(l.address, ''), '^((\S+\s+){0,2}\S+(동|읍|면|리|가)\d*).*
select
  (select count(*) from information_schema.columns
     where table_name = 'listings' and column_name = 'last_checked_at') as has_column,   -- 1
  (select count(*) from listings where last_checked_at is not null) as checked_rows;     -- 0 (아직 아무도 누르지 않음)
, '\1') else l.address end as address,
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

-- [검증]
select
  (select count(*) from information_schema.columns
     where table_name = 'listings' and column_name = 'last_checked_at') as has_column,   -- 1
  (select count(*) from listings where last_checked_at is not null) as checked_rows;     -- 0 (아직 아무도 누르지 않음)
