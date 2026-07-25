-- ORDER-e2l-map-roadview-v1 — 지도 좌표 + 공개 opt-in 컬럼. 대표 콘솔 실행.
-- 지오코딩은 등록/수정 시 1회 저장(표시 때마다 호출 금지 — 비용 원칙).

ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude  double precision;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS show_map  boolean NOT NULL DEFAULT true;

-- 기존 상가 백필:
--   show_map = default true 로 자동 채워짐(별도 작업 불필요).
--   latitude/longitude = NULL → 두 방법 중 택1
--     (A) 소유자가 각 상가 '수정' 1회 저장하면 그때 지오코딩되어 채워짐(무비용, 점진).
--     (B) 일괄 백필: NCP 키 주입 후 scripts/backfill-geocode.mjs 실행(주소별 지오코딩 1회, 5초 간격).
--         → latitude IS NULL 인 landlord 행만 대상. (스크립트는 키 도착 후 작성)

-- 확인:
SELECT count(*) AS 좌표있음 FROM listings WHERE latitude IS NOT NULL;
SELECT show_map, count(*) FROM listings GROUP BY 1;
