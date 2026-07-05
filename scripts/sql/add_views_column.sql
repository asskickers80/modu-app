-- listings에 조회수(views) 컬럼 추가
-- 실행: Supabase SQL Editor에서 실행
-- 실행 후 E2PropertyDetail이 진입 시 views += 1 자동 처리됨

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;
