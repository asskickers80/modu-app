-- ORDER-landlord-content-v1 — daily_contents에 임대인 콘텐츠 타입 2종 허용.
-- 대표 콘솔 실행 후, 임대인 배치(generate-daily-contents.js landlord 섹션)가 적재 가능.
-- 뉴스(market_news)는 스키마 변경 불필요(biz_type='부동산' 값만 추가 — 컬럼 text).

ALTER TABLE daily_contents DROP CONSTRAINT IF EXISTS daily_contents_content_type_check;
ALTER TABLE daily_contents ADD CONSTRAINT daily_contents_content_type_check
  CHECK (content_type IN ('seller_guide','coaching','landlord_guide','landlord_coaching'));

-- 확인:
SELECT content_type, count(*) FROM daily_contents GROUP BY 1 ORDER BY 1;
