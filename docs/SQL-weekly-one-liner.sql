-- ORDER-weekly-one-liner-v1 — "이번 주 한 줄" 저장 테이블 (대표 실행, 멈춤(a))
-- ※ 앱은 이 SQL 실행 전에도 기존 기능이 깨지지 않는다(신규 테이블 — 조회 실패 시
--    카드가 안 보이고 기존 "오늘의 한 마디"가 그대로 표시된다).
-- ※ 신원: 앱 표준(기기 ID 기준 + 로그인 시 user_id 스탬프)을 따른다 — 매출(daily_sales)·
--    문의(conversations)가 전부 device_id 기준이라 계산 주체인 크론도 device_id로 묶는다.

create table if not exists weekly_one_liners (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid,                        -- 계정 귀속(있을 때만)
  role text not null,                  -- 'operating' | 'seller'
  week_start date not null,            -- 그 주 월요일 (KST 기준)
  signal_key text not null,            -- weekday_drop3 · month_drop20 · inquiry_topic 등
  headline text not null,              -- 문장 1줄 (고정 템플릿 — AI 없음)
  evidence text,                       -- 근거 1줄
  cta_key text,                        -- 버튼 동작 키 (앱이 해석)
  cta_payload jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  dismissed_at timestamptz,            -- X 누른 시각 (그 주만 숨김)
  unique (device_id, role, week_start) -- 한 주 · 한 축 · 한 줄
);
create index if not exists weekly_one_liners_lookup_idx
  on weekly_one_liners (device_id, role, week_start desc);

-- RLS — 기존 울타리 수준(DELETE 차단). INSERT는 크론(anon 키, 기존 크론 선례)용,
-- UPDATE는 X(dismissed_at) 처리용.
alter table weekly_one_liners enable row level security;
create policy "weekly_one_liners_select" on weekly_one_liners for select using (true);
create policy "weekly_one_liners_insert" on weekly_one_liners for insert with check (true);
create policy "weekly_one_liners_update" on weekly_one_liners for update using (true);
-- DELETE 정책 없음 = 삭제 차단

-- 검증
select count(*) from weekly_one_liners;  -- 0
