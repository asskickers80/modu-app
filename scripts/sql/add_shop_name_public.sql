-- [4] 상호 공개/비공개 컬럼 추가
-- 실행: Supabase 대시보드 SQL 에디터
-- 기존 매물은 DEFAULT true 로 전부 공개 처리됨

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS shop_name_public boolean NOT NULL DEFAULT true;

-- 기존 매물 명시적 공개 처리 (DEFAULT가 이미 처리하지만 명시)
UPDATE public.listings
  SET shop_name_public = true
  WHERE shop_name_public IS NULL;
