-- 기업회원 업체 분류 7종 제한 (2026-11-09) — 앱·PC 공통 기준(PC docs/shared-data-sync-contract.md)
-- 앱 코드(098225c)는 이미 7종으로만 저장한다. 이 SQL은 DB 쪽에서도 7종 밖의 값을 막는 안전장치.
-- 실행 순서: ① 확인 → ② 적용 → ③ 검증. 대표님이 Supabase SQL Editor에서 실행.

-- ① 확인 (읽기만): 지금 값이 NULL 또는 7종뿐이어야 ②가 성공한다. 현재 기업회원 행은 0건.
SELECT biz_category, COUNT(*) AS n
FROM public.listings
WHERE biz_category IS NOT NULL
GROUP BY 1 ORDER BY 1;

-- 기존에 걸려 있는 CHECK 제약 목록 (biz_category 관련이 이미 있는지 확인용)
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'public.listings'::regclass AND contype = 'c';

-- ② 적용 (7종 밖의 값이 이미 있으면 실패하고 아무것도 바뀌지 않는다)
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_biz_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_biz_category_check
  CHECK (biz_category IS NULL OR biz_category IN
    ('consulting','interior','equipment','professional','finance','operations','marketing'));

-- ③ 검증 (읽기만): 제약이 붙었는지
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'public.listings'::regclass AND conname = 'listings_biz_category_check';
