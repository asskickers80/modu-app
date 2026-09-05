-- ORDER-close-flow-peer-stats-v1 — 스키마 SQL (대표 실행, 멈춤(a))
-- ※ 앱은 이 SQL 실행 전에도 기존 기능이 깨지지 않는다(전부 신규 테이블/컬럼 추가 —
--    조회 실패 시 해당 카드·벨·로깅이 조용히 비활성, 기존 흐름 무변경).
-- ※ 항목 [1]~[4] 순서대로 실행. 전체를 한 번에 실행해도 안전(재실행에도 안전).
-- ※ 신원 모델: 오더 명세의 user_id에 더해 앱 표준(기기 ID 기준 + 로그인 시 user_id
--    스탬프 — daily_sales와 동일 선례)대로 device_id를 함께 둔다.

-- ══════════════════════════════════════════════════════════════
-- [1] 이벤트 로깅 인프라 — events
-- ══════════════════════════════════════════════════════════════
create table if not exists events (
  id bigint generated always as identity primary key,
  device_id text not null,
  user_id uuid,                        -- 계정 귀속(로그인 시)
  listing_id uuid,                     -- 매물 관련 이벤트만 (nullable)
  event_name text not null,            -- close_flow_open, peer_stats_shown 등
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_name_idx on events (event_name, created_at desc);
create index if not exists events_listing_idx on events (listing_id) where listing_id is not null;

-- RLS: 쓰기(insert)만 개방 — 이벤트는 클라이언트가 읽을 일이 없다(분석은 콘솔/서버).
alter table events enable row level security;
create policy "events_insert" on events for insert with check (true);
-- SELECT/UPDATE/DELETE 정책 없음 = 차단

select count(*) from events;  -- 검증: 0

-- ══════════════════════════════════════════════════════════════
-- [2] 마감 흐름 — status 'sold' + 마감 설문 + 프리미엄 부여
-- ══════════════════════════════════════════════════════════════

-- 2-1) listings.status CHECK 제약에 'sold' 추가
--      제약 이름·유무를 모르는 상태를 안전 처리: status CHECK가 있으면
--      (실제 존재 값 ∪ 코드 사용 6종 ∪ sold)로 재생성, 원래 없으면 그대로 둠.
do $$
declare
  c record;
  had boolean := false;
  vals text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.listings'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    had := true;
    execute format('alter table public.listings drop constraint %I', c.conname);
  end loop;
  if had then
    select string_agg(quote_literal(s), ', ') into vals
    from (
      select distinct status as s from public.listings where status is not null
      union
      select unnest(array['published','example','negotiating','hidden','completed','deleted','sold'])
    ) t;
    execute 'alter table public.listings add constraint listings_status_check check (status in (' || vals || '))';
    raise notice 'status CHECK 재생성 (sold 포함): %', vals;
  else
    raise notice 'status CHECK 원래 없음 — 제약 미추가 (sold 저장에 지장 없음)';
  end if;
end $$;

-- 2-2) 마감 설문 — 1단계 선택 즉시 insert, 2·3단계에서 update (스킵해도 1단계 기록 보존)
create table if not exists listing_close_surveys (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  device_id text not null,
  user_id uuid,
  close_reason text not null,          -- sold | rest | keep (팔렸어요/잠깐 쉴게요/계속 운영·보유)
  final_price_band text,               -- same | adj_10 | adj_10_30 | adj_30plus
  deal_channel text,                   -- modu | broker | direct
  next_plan text,                      -- find | operating | rest | unknown
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists close_surveys_listing_idx on listing_close_surveys (listing_id);

alter table listing_close_surveys enable row level security;
create policy "close_surveys_select" on listing_close_surveys for select using (true);
create policy "close_surveys_insert" on listing_close_surveys for insert with check (true);
create policy "close_surveys_update" on listing_close_surveys for update using (true);
-- DELETE 정책 없음 = 차단

-- 2-3) 프리미엄 부여 — 연장은 새 행 insert(이력 보존), 유효분 = expires_at 최댓값
create table if not exists premium_grants (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid,
  days integer not null,               -- 30
  reason text not null,                -- 'sold_survey'
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists premium_grants_device_idx on premium_grants (device_id, expires_at desc);

alter table premium_grants enable row level security;
create policy "premium_grants_select" on premium_grants for select using (true);
create policy "premium_grants_insert" on premium_grants for insert with check (true);
-- UPDATE/DELETE 정책 없음 = 차단 (부여 이력은 불변)

select count(*) from listing_close_surveys;  -- 검증: 0
select count(*) from premium_grants;         -- 검증: 0

-- ══════════════════════════════════════════════════════════════
-- [3] 알림 센터 — notifications ("모두 발송" 전용)
-- ══════════════════════════════════════════════════════════════
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  device_id text,                      -- 클라이언트 기준 식별 (크론 생성 시 null 가능)
  user_id uuid,                        -- 서버(크론) 생성 기준
  type text not null,                  -- repost_remind | lease_end | peer_trend | my_value | notice
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,            -- 예약 발송 시각 (즉시면 null)
  sent_at timestamptz,                 -- 발송(노출 개시) 시각
  read_at timestamptz,                 -- 읽음 시각
  created_at timestamptz not null default now(),
  check (device_id is not null or user_id is not null)  -- 수신자 식별 필수
);
create index if not exists notifications_device_idx on notifications (device_id, created_at desc)
  where device_id is not null;
create index if not exists notifications_user_idx on notifications (user_id, created_at desc)
  where user_id is not null;

-- RLS: 읽기 + 읽음 처리(update)만 개방 — 생성은 서버(크론, service role)가 담당.
alter table notifications enable row level security;
create policy "notifications_select" on notifications for select using (true);
create policy "notifications_update" on notifications for update using (true);
-- INSERT/DELETE 정책 없음 = 클라이언트 생성·삭제 차단 (가짜 알림 방지 울타리)

select count(*) from notifications;  -- 검증: 0

-- [3-보완] INSERT 정책 개방 — 크론(send-notifications)이 기존 크론 선례대로 anon 키를
-- 쓰므로 INSERT 경로가 필요하다. 기존 테이블과 같은 울타리 수준(DELETE만 차단)으로 통일.
-- (가짜 알림 방지는 크론 룰이 담당 — 표본 미충족 시 생성 0, dedupe_key 중복 차단)
create policy "notifications_insert" on notifications for insert with check (true);

-- ══════════════════════════════════════════════════════════════
-- [4] 문의 동향 카드 — listings.published_at 추가 + 백필
-- ══════════════════════════════════════════════════════════════
alter table listings add column if not exists published_at timestamptz default now();
update listings set published_at = created_at where published_at is null;

-- 검증: 두 수가 같아야 한다 (published_at null 0건)
select count(*) as total, count(published_at) as with_published_at from listings;
