-- 업종 분류 3필드 (docs/INDUSTRY-CATEGORY-MAP.md 저장 구조)
-- 실행: Supabase 콘솔 SQL Editor (프로젝트 edcqvmgqskeoegpqxlzy 확인 후)
-- ※ 앱은 컬럼이 없어도 profile_data(JSONB)로 폴백 저장하므로, 이 SQL은 언제 실행해도 안전.

-- 1) profiles — 온보딩에서 수집한 업종 분류
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category_main TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category_sub  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ksic_code     TEXT;

-- 2) 기존 가입자 백필 — profile_data JSONB에 이미 저장된 값을 전용 컬럼으로
UPDATE profiles SET
  category_main = COALESCE(category_main, profile_data->>'category_main'),
  category_sub  = COALESCE(category_sub,  profile_data->>'category_sub'),
  ksic_code     = COALESCE(ksic_code,     profile_data->>'ksic_code')
WHERE profile_data ? 'category_main';

-- 3) listings — 매물 등록(E1)에 분류 도입 시 사용할 동일 3필드 (선반영, 현재 앱은 미기록)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_main TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_sub  TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ksic_code     TEXT;
