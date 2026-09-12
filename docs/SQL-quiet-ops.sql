-- 운영 대시보드 2줄 (ORDER 2026-09-12 파트 B8) — 읽기 전용. 화면 없음.
-- 1) quiet → public 전환율 (조용히 시작한 매물 중 공개로 바뀐 비율)
select
  count(*) filter (where quiet_started_at is not null) as quiet_started,
  count(*) filter (where quiet_started_at is not null and visibility = 'public') as switched_public,
  round(100.0 * count(*) filter (where quiet_started_at is not null and visibility = 'public') / nullif(count(*) filter (where quiet_started_at is not null), 0), 1) as quiet_to_public_pct
from listings where listing_type in ('seller', 'landlord');

-- 2) quiet 매물 문의율 vs public (같은 기간 30일, 매물당 대화 수)
with recent as (
  select l.id, l.visibility, (select count(*) from conversations c where c.listing_id = l.id) as inquiries
  from listings l where l.listing_type in ('seller', 'landlord') and l.status in ('published', 'negotiating')
    and coalesce(l.published_at, l.created_at) >= now() - interval '30 days'
)
select visibility, count(*) as listings, round(avg(inquiries), 2) as avg_inquiries, round(100.0 * count(*) filter (where inquiries > 0) / nullif(count(*), 0), 1) as inquired_pct
from recent group by visibility order by visibility;
