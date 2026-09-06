-- KST 날짜 결함 점검 (ORDER-key-proxy-account-deletion 결정 2)
-- ※ 실행 불필요 — 2026-09-06 점검 결과 대상 0건. 재발 확인용으로만 남긴다.
--
-- 결함: 앱이 toISOString()(UTC)으로 '오늘'을 만들어, 00~09시 KST 입력이
--       하루 전 날짜로 저장됐다. 코드는 KST 기준(lib/weekUtil.kstToday)으로 고쳤다.

-- 1) 새벽(00~09 KST)에 입력된 행 = 날짜가 밀렸을 수 있는 행
select
  device_id,
  sale_date,
  created_at at time zone 'Asia/Seoul' as created_kst,
  (created_at at time zone 'Asia/Seoul')::date as kst_date_at_input,
  case when sale_date = ((created_at at time zone 'Asia/Seoul')::date - 1)
       then '밀렸을 가능성' else '정상' end as verdict
from daily_sales
where extract(hour from (created_at at time zone 'Asia/Seoul')) < 9
order by created_at;

-- 2) 대상 건수만
select count(*) as dawn_rows
from daily_sales
where extract(hour from (created_at at time zone 'Asia/Seoul')) < 9;

-- ── 정정이 필요해질 경우에만 (지금은 대상 0건이라 실행하지 말 것) ──
-- 주의: 소급 입력(사용자가 날짜 칩으로 과거를 고른 경우)은 정상이므로 일괄 +1은 위험하다.
-- 반드시 위 1)의 verdict를 눈으로 확인하고 개별 행만 고칠 것.
--
-- update daily_sales set sale_date = sale_date + 1 where id = '<확인한 행 id>';
