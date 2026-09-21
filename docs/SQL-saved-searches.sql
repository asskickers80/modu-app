-- ORDER 2026-09-21 파트 C1 — 저장한 조건 + 수요 집계 (대표 실행, 멈춤 a)
-- 추가(add)만. 미실행 상태에서도 탐색·완화 카드는 그대로 동작한다(저장 버튼만 조용히 실패 안내).
-- 재실행 안전: if not exists / drop policy if exists.
-- 원칙: facts 에는 원문 필터·user_id 를 넣지 않는다. 기업회원 축은 이 두 표를 읽지 않는다.

create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id text,
  filters jsonb not null,                 -- 사용자가 건 조건 그대로(알림 판정 재료)
  region_code text,                       -- 집계용 지역 키(현재 화면은 지역 라벨 문자열)
  industry_code text,                     -- 집계용 업종 키(대분류). 없으면 null
  created_at timestamptz not null default now(),
  paused_at timestamptz,                  -- 끄기(삭제 아님)
  deleted_at timestamptz,
  last_notified_at timestamptz
);
create index if not exists saved_searches_user_idx on saved_searches (user_id, deleted_at, created_at desc);
create index if not exists saved_searches_region_idx on saved_searches (region_code, industry_code);

create table if not exists search_demand_facts (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  region_code text not null,
  industry_code text,
  kind text not null,                     -- empty_result | saved_search
  count integer not null default 0,
  constraint search_demand_facts_kind_check check (kind in ('empty_result', 'saved_search')),
  unique (month, region_code, industry_code, kind)
);
create index if not exists search_demand_facts_month_idx on search_demand_facts (month desc, region_code);

alter table saved_searches enable row level security;
alter table search_demand_facts enable row level security;
do $$ declare t text; begin
  foreach t in array array['saved_searches', 'search_demand_facts'] loop
    execute format('drop policy if exists "%1$s_select" on %1$s', t);
    execute format('create policy "%1$s_select" on %1$s for select using (true)', t);
    execute format('drop policy if exists "%1$s_insert" on %1$s', t);
    execute format('create policy "%1$s_insert" on %1$s for insert with check (true)', t);
    execute format('drop policy if exists "%1$s_update" on %1$s', t);
    execute format('create policy "%1$s_update" on %1$s for update using (true)', t);
  end loop;
end $$;

-- [검증]
select
  (select count(*) from saved_searches) as saved_searches,                 -- 0
  (select count(*) from search_demand_facts) as demand_facts,              -- 0
  (select count(*) from information_schema.columns
     where table_name = 'search_demand_facts' and column_name in ('user_id', 'filters')) as leak_cols;  -- 0 (원문·식별자 없음)
