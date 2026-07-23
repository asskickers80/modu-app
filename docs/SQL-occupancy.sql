-- ORDER-e1p-yield-required-v1 — 임차 현황(공실) 컬럼. 대표 콘솔 실행 후 코드 정상 동작.
-- 신설은 이 1개뿐 — 현/예상 보증금·월세·수익률은 기존 컬럼 재사용(occupancy로 현/예상 구분).
--
-- 재사용 매핑:
--   현/예상 보증금 → deposit          (occupancy='occupied'→현, 'vacant'→예상)
--   현/예상 월세   → monthly_rent      (동일)
--   수익률/예상수익률 → cap_rate       (연 월세×12 ÷ 매매가 ×100, 자동계산 저장. occupancy로 라벨 구분)
--   매매 희망가    → sale_price        (기존)
-- 신설:
--   임차 현황     → occupancy text     ('occupied'|'vacant')

ALTER TABLE listings ADD COLUMN IF NOT EXISTS occupancy text;
DO $$ BEGIN
  ALTER TABLE listings ADD CONSTRAINT listings_occupancy_chk CHECK (occupancy IS NULL OR occupancy IN ('occupied','vacant'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 확인:
SELECT occupancy, count(*) FROM listings GROUP BY 1;
