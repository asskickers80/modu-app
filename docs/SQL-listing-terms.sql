-- ORDER-listing-terms-confirm-v1 — 등록 확인사항 동의 기록. 대표 콘솔 실행.
-- 공개 시점에 동의 시각·문안 버전 기록. 버전(src/lib/listingTerms.js TERMS_VERSION) 변경 시 재동의.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS terms_agreed_at timestamptz;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS terms_version text;

-- 확인:
SELECT terms_version, count(*) FROM listings GROUP BY 1;
