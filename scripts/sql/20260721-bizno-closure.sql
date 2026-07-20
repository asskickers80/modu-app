-- 사업자번호 등록 + 폐업 자동 감지 — 스키마 (제시만, 실행은 대표님 콘솔)
-- 실행: Supabase 콘솔 SQL Editor (프로젝트 edcqvmgqskeoegpqxlzy 확인 후)
-- 오더: docs/ORDER-bizno-closure-check.md
--
-- ※ 폐업은 새 status 값을 만들지 않는다. 오더 원칙 "자동 완료 금지, 자동 비공개"에 따라
--   폐업 감지 시 status='hidden' 으로 내리고, 아래 closure_* 컬럼에 별도 표식을 남긴다.
--   (완료/재공개/유지 판단은 소유자 몫 — 홈 확인 카드에서 결정)
-- ※ status CHECK 제약(20260720-negotiating-status.sql)은 그대로 둔다. hidden은 이미 허용 값.

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1) 사업자번호 — 공개 게이트 통과 시에만 저장되는 검증된 사실
--    비공개 정보다. 방문자 노출 쿼리(ExplorePage·E2)는 이 컬럼을 select 하지 않는다.
-- ────────────────────────────────────────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS business_number  TEXT;    -- 10자리 숫자, 하이픈 없이
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bizno_verified_at TIMESTAMPTZ; -- 국세청 진위확인 통과 시각

-- ────────────────────────────────────────────────────────────
-- 2) 폐업 감지 표식 — 주 1회 배치가 기록
--    closure_detected_at 이 NULL 아니고 status='hidden' 이면 '소유자 확인 대기'.
--    소유자가 카드에서 선택하면 배치가 다시 건드리지 않도록 closure_resolved_at 을 찍는다.
-- ────────────────────────────────────────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS closure_detected_at TIMESTAMPTZ; -- 폐업 감지 시각
ALTER TABLE listings ADD COLUMN IF NOT EXISTS closure_prev_status TEXT;        -- 감지 직전 status (되돌림 참고)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS closure_resolved_at TIMESTAMPTZ; -- 소유자 확인 완료 시각
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bizno_status_code   TEXT;        -- 국세청 b_stt_cd (01 계속/02 휴업/03 폐업)

COMMIT;

-- ────────────────────────────────────────────────────────────
-- 3) 검증 쿼리 (COMMIT 후 따로 실행)
-- ────────────────────────────────────────────────────────────
-- 3-a) 컬럼 6개가 붙었는지 — 기대: 6행
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='listings'
--   AND column_name IN ('business_number','bizno_verified_at','closure_detected_at',
--                       'closure_prev_status','closure_resolved_at','bizno_status_code')
-- ORDER BY column_name;

-- 3-b) 배치 대상(현재) — 기대: published+negotiating 10건, business_number 전부 NULL
-- SELECT status, COUNT(*), COUNT(business_number) AS bizno_있음
-- FROM listings WHERE status IN ('published','negotiating') GROUP BY status;

-- ────────────────────────────────────────────────────────────
-- 4) RLS 참고 (실행 아님)
--    폐업 배치는 서버(api/)에서 anon 키로 status 를 update 한다.
--    현재 RLS는 "울타리 수준(DELETE만 차단)"이라 anon UPDATE 가 열려 있어 동작은 하지만,
--    이는 "아무나 남의 매물 status 를 바꿀 수 있다"는 뜻이기도 하다.
--    정식 RLS(로그인 데이터 귀속) 도입 시 배치용 서비스 롤 키가 필요해진다 —
--    지금 도입하면 아래 형태가 되나, 서비스 롤 키가 코드베이스에 없어 이번엔 제시만 한다.
-- (예시) 배치 전용 정책: service_role 만 closure_* 컬럼을 쓰도록 제한.
