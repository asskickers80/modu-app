-- ORDER-key-proxy-account-deletion 작업 D — 등록 초안 서버 저장 (대표 실행, 멈춤(a))
-- ※ 작성만 하고 실행하지 않았다. 미실행 상태에서도 기존 기능은 깨지지 않는다
--    (앱은 draft 저장이 실패하면 기존 sessionStorage 초안만으로 그대로 동작).

-- ══════════════════════════════════════════════════════════════
-- [1] status CHECK 제약에 'draft' 추가
-- ══════════════════════════════════════════════════════════════
-- 제약 이름·유무를 모르는 상태를 안전 처리: status CHECK가 있으면
-- (실제 존재 값 ∪ 코드 사용 값 ∪ draft)로 재생성, 원래 없으면 그대로 둔다.
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
      select unnest(array['published','example','negotiating','hidden','completed','deleted','sold','draft'])
    ) t;
    execute 'alter table public.listings add constraint listings_status_check check (status in (' || vals || '))';
    raise notice 'status CHECK 재생성 (draft 포함): %', vals;
  else
    raise notice 'status CHECK 원래 없음 — 제약 미추가 (draft 저장에 지장 없음)';
  end if;
end $$;

-- ══════════════════════════════════════════════════════════════
-- [2] ★ 핵심 — draft 노출 차단 (D-2)
-- ══════════════════════════════════════════════════════════════
-- 지금까지 listings SELECT는 "울타리 수준"(using true)이라 anon key로 모든 행이 읽혔다.
-- 앱 코드 필터는 별도 저장소인 웹(modu-web)이나 API 직접 호출을 막지 못한다.
-- 실제 차단은 이 정책 하나뿐이다.
--
-- 판정(대표 승인 2026-09-06): 서버 초안은 로그인 사용자만.
--   device_id는 클라이언트가 보내는 값이라 RLS로 소유권을 증명할 수 없다(위조 가능).
--   따라서 비로그인 초안은 서버에 올리지 않고 sessionStorage로만 두고,
--   로그인하는 순간 finishLogin이 서버로 승계한다.
drop policy if exists "listings_select" on listings;
create policy "listings_select" on listings
  for select
  using (
    status is distinct from 'draft'      -- 초안이 아니면 기존과 동일하게 공개
    or user_id = auth.uid()              -- 초안은 본인만 (비로그인 anon은 auth.uid()가 null)
  );

-- 참고: 기존 정책 이름이 다를 수 있다. 아래로 현재 정책을 확인하고,
-- listings의 SELECT 정책이 둘 이상 남아 있으면 여분을 지워야 한다
-- (PostgreSQL은 SELECT 정책을 OR로 합치므로, 남은 using(true) 정책이 있으면 위 차단이 무력화된다).
select policyname, cmd, qual
from pg_policies
where tablename = 'listings' and cmd = 'SELECT';

-- ══════════════════════════════════════════════════════════════
-- [3] 검증
-- ══════════════════════════════════════════════════════════════
-- 3-1) draft 행 수 (아직 0이어야 정상)
select count(*) as drafts from listings where status = 'draft';

-- 3-2) SELECT 정책이 위 하나만 남았는지
select count(*) as select_policies from pg_policies
where tablename = 'listings' and cmd = 'SELECT';
