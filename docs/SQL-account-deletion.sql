-- ORDER-key-proxy-account-deletion 작업 B — 계정 삭제·원장 분리 (대표 실행, 멈춤(a))
-- ※ 작성만 하고 실행하지 않았다. 미실행 상태에서도 기존 기능은 깨지지 않는다
--    (전부 신규 테이블/컬럼 추가 — 앱은 없으면 해당 기능만 조용히 비활성).

-- ══════════════════════════════════════════════════════════════
-- [1] consents — 동의 이력
-- ══════════════════════════════════════════════════════════════
-- 기존 등록 확인사항 동의(listings.terms_agreed_at·terms_version)와의 관계:
--   그것은 "이 매물을 공개할 때 확인한 사항"으로 매물 단위 기록이다. 성격이 달라
--   여기로 옮기지 않는다(중복 저장소 금지). consents는 계정 단위 동의만 담는다.
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  consent_type text not null,   -- terms | privacy | marketing_contact | retention_after_withdrawal
  version text not null,
  agreed_at timestamptz not null default now(),
  withdrawn_at timestamptz,     -- 철회 시각 (행을 지우지 않고 철회로 기록)
  created_at timestamptz not null default now(),
  constraint consents_type_check check (
    consent_type in ('terms', 'privacy', 'marketing_contact', 'retention_after_withdrawal')
  )
);
create unique index if not exists consents_user_type_version_idx
  on consents (user_id, consent_type, version);
create index if not exists consents_user_idx on consents (user_id);

alter table consents enable row level security;
create policy "consents_select" on consents for select using (true);
create policy "consents_insert" on consents for insert with check (true);
create policy "consents_update" on consents for update using (true);
-- DELETE 정책 없음 = 삭제 차단 (동의 이력은 지우지 않는다)

-- ══════════════════════════════════════════════════════════════
-- [2] deal_records — 비식별 거래 성사 원장
-- ══════════════════════════════════════════════════════════════
-- user_id·listing_id를 두지 않는다. 재식별 방지를 위해 지역은 구 단위까지만.
-- 마감 흐름에서 "팔렸어요"를 고른 시점에 적재하며, 기존 설문값을 그대로 쓴다.
create table if not exists deal_records (
  id uuid primary key default gen_random_uuid(),
  listing_type text not null,        -- seller | landlord
  category_main text,                -- 업종 대분류
  category_sub text,                 -- 업종 소분류
  region_sido text,                  -- 시도
  region_gu text,                    -- 구·군 (동·번지 금지 — 재식별 방지)
  price_band text,                   -- 권리금 구간 (설문 final_price_band)
  area_band text,                    -- 면적 구간 (예: '30_50')
  deal_channel text,                 -- modu | broker | direct
  closed_on date not null,           -- 성사일 (시각 아닌 날짜 — 정밀도 축소)
  created_at timestamptz not null default now()
);
create index if not exists deal_records_lookup_idx
  on deal_records (listing_type, category_sub, region_gu, closed_on desc);

alter table deal_records enable row level security;
create policy "deal_records_select" on deal_records for select using (true);
create policy "deal_records_insert" on deal_records for insert with check (true);
-- UPDATE/DELETE 정책 없음 = 원장 불변

-- ══════════════════════════════════════════════════════════════
-- [3] 탈퇴 표시 컬럼
-- ══════════════════════════════════════════════════════════════
alter table profiles add column if not exists deleted_at timestamptz;

-- ══════════════════════════════════════════════════════════════
-- [4] 검증
-- ══════════════════════════════════════════════════════════════
select count(*) as consents from consents;         -- 0
select count(*) as deal_records from deal_records; -- 0
select column_name from information_schema.columns
where table_name = 'profiles' and column_name = 'deleted_at';
