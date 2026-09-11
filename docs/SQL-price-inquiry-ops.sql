-- 운영 대시보드 쿼리 (ORDER 2026-09-11 파트 C6) — 읽기 전용. 화면 없음.
-- assignee_type(vendor | modu)별 응답률 · 대화 전환율 · helped 비율. 모두 법인이 켜지면 같은 쿼리로 비교한다.
with t as (
  select t.assignee_type,
         count(*)                                   as sent,
         count(*) filter (where t.responded_at is not null) as responded,
         count(*) filter (where t.conversation_id is not null) as opened
  from demand_signal_targets t
  group by t.assignee_type
),
f as (
  select t.assignee_type,
         count(distinct f.signal_id) filter (where f.result = 'helped') as helped,
         count(distinct f.signal_id)                                    as feedback
  from price_inquiry_feedback f
  join demand_signal_targets t on t.signal_id = f.signal_id and t.conversation_id is not null
  group by t.assignee_type
)
select t.assignee_type,
       t.sent, t.responded, round(100.0 * t.responded / nullif(t.sent, 0), 1)  as response_rate_pct,
       t.opened,    round(100.0 * t.opened / nullif(t.responded, 0), 1)       as dm_open_rate_pct,
       coalesce(f.helped, 0) as helped, coalesce(f.feedback, 0) as feedback,
       round(100.0 * coalesce(f.helped, 0) / nullif(coalesce(f.feedback, 0), 0), 1) as helped_rate_pct
from t left join f on f.assignee_type = t.assignee_type
order by t.assignee_type;

-- 대상 0곳으로 보류(pending)된 신호 — 영업 리스트(§2-e): 지역·요청 칩·시각
select region_gu, attachment->'chips' as chips, created_at from demand_signals where pending order by created_at desc limit 100;
