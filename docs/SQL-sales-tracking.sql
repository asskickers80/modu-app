-- ORDER-sales-tracking-v1 — 매출 기록·고정비 테이블 (대표 실행, 멈춤(a))
-- ※ 앱은 이 SQL 실행 전에도 기존 기능이 깨지지 않는다(신규 테이블 — 조회 실패 시 카드가
--    입력 유도 상태로만 동작, 저장 실패는 정직 안내). 실행 후 저장·분석이 가동된다.

-- 1) 일 매출 기록 — 일 단위 행 (향후 기간 집계 → 양도 증빙 생성 가능 형태)
create table if not exists daily_sales (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,             -- 신원 모델: 기기 ID 기준 (로그인 병합은 기존 규칙)
  user_id uuid,                        -- 계정 귀속(로그인 시) — listings.user_id와 동일 취지
  sale_date date not null,
  revenue integer not null,            -- 원 단위 총매출 (배달 포함 총액)
  delivery_revenue integer,            -- 원 단위 배달 매출 (총매출 중 배달 몫, 선택)
  customers integer,                   -- 손님 수 (선택)
  memo text,                           -- 한 줄 메모 (선택)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, sale_date)        -- 같은 날 재입력 = 갱신(upsert)
);
create index if not exists daily_sales_device_date_idx on daily_sales (device_id, sale_date desc);

-- 2) 고정비 — 현재값 단일 행 (월 단위 관리, 변경 시에만 수정)
--    납부일(due_day)을 함께 저장 — 후속 "오늘 할 일"(일정관리)이 D-n 알림을 역산할 재료
create table if not exists fixed_costs (
  device_id text primary key,
  user_id uuid,
  rent integer,                        -- 임대료 (원)
  rent_due_day smallint,               -- 임대료 납부일 (1~31)
  labor integer,                       -- 인건비 (원)
  labor_due_day smallint,              -- 급여일 (1~31)
  maintenance integer,                 -- 관리비 (원)
  maintenance_due_day smallint,        -- 관리비 납부일 (1~31)
  others integer,                      -- 기타 (원)
  updated_at timestamptz not null default now()
);

-- 3) RLS — 기존 울타리 수준과 동일 (DELETE 차단, 나머지 개방)
alter table daily_sales enable row level security;
alter table fixed_costs enable row level security;
create policy "daily_sales_select" on daily_sales for select using (true);
create policy "daily_sales_insert" on daily_sales for insert with check (true);
create policy "daily_sales_update" on daily_sales for update using (true);
create policy "fixed_costs_select" on fixed_costs for select using (true);
create policy "fixed_costs_insert" on fixed_costs for insert with check (true);
create policy "fixed_costs_update" on fixed_costs for update using (true);
-- DELETE 정책 없음 = 삭제 차단 (기존 테이블과 동일 울타리)

-- 4) 검증
select count(*) from daily_sales;
select count(*) from fixed_costs;
