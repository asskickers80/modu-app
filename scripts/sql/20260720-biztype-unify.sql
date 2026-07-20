-- 업종 분류 통일 0단계 — 스키마 + 백필 (제시안)
-- 실행: Supabase 콘솔 SQL Editor (프로젝트 edcqvmgqskeoegpqxlzy 확인 후)
-- 근거·매핑 판단: docs/BIZTYPE-UNIFY-STEP0.md
--
-- ※ listings의 3컬럼은 20260716-industry-category-columns.sql 에서 이미 추가됨(실DB 확인).
--   여기서는 안전망으로 IF NOT EXISTS만 두고, 실질 작업은 백필 UPDATE.
-- ※ 기존 biz_type 컬럼은 삭제하지 않는다 (병행 기간 — 표시·필터가 계속 사용).
-- ※ 매핑 불확실 항목은 의도적으로 NULL로 남긴다 (추측 매핑 금지 — 대표님 판단 후 추가).

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1) franchise_brands — 3컬럼 추가 (신규)
-- ────────────────────────────────────────────────────────────
ALTER TABLE franchise_brands ADD COLUMN IF NOT EXISTS category_main TEXT;
ALTER TABLE franchise_brands ADD COLUMN IF NOT EXISTS category_sub  TEXT;
ALTER TABLE franchise_brands ADD COLUMN IF NOT EXISTS ksic_code     TEXT;

-- 1-a) 데이터 위생 — 후행/중복 공백 정리 (매핑 전에 먼저)
--      '외식 > 아이스크림/빙수 ', '서비스 > 부동산 중개 ' 등
UPDATE franchise_brands
SET biz_type = regexp_replace(btrim(biz_type), '\s+', ' ', 'g')
WHERE biz_type IS DISTINCT FROM regexp_replace(btrim(biz_type), '\s+', ' ', 'g');

-- 1-b) 소분류까지 확정되는 29종
UPDATE franchise_brands SET
  category_main = m.main, category_sub = m.sub, ksic_code = m.ksic
FROM (VALUES
  ('외식 > 한식',            '요식업',        '한식',                 '56111'),
  ('외식 > 치킨',            '요식업',        '치킨',                 '56193'),
  ('외식 > 중식',            '요식업',        '중식',                 '56121'),
  ('외식 > 일식',            '요식업',        '일식',                 '56122'),
  ('외식 > 서양식',          '요식업',        '양식·레스토랑',        '56123'),
  ('외식 > 분식',            '요식업',        '분식',                 '56194'),
  ('외식 > 피자',            '요식업',        '피자·버거·샌드위치',   '56192'),
  ('외식 > 패스트푸드',      '요식업',        '피자·버거·샌드위치',   '56192'),
  ('외식 > 기타 외식',       '요식업',        '기타 음식점',          NULL),
  ('외식 > 기타 외국식',     '요식업',        '기타 음식점',          NULL),
  ('외식 > 커피',            '카페·베이커리', '카페·커피전문점',      '56221'),
  ('외식 > 제과제빵',        '카페·베이커리', '제과·베이커리',        '56191'),
  ('외식 > 아이스크림/빙수', '카페·베이커리', '아이스크림·빙수',      '56229'),
  ('외식 > 음료 (커피 외)',  '카페·베이커리', '주스·음료 테이크아웃', '56229'),
  ('외식 > 주점',            '주점',          '기타 주점',            '56219'),
  ('서비스 > PC방',          '오락·레저',     'PC방',                 '91222'),
  ('서비스 > 오락',          '오락·레저',     '기타 오락·레저',       '91299'),
  ('서비스 > 세탁',          '교육·서비스',   '세탁소·빨래방',        '96911'),
  ('서비스 > 자동차 관련',   '교육·서비스',   '카센터·세차장',        '95212'),
  ('서비스 > 부동산 중개',   '교육·서비스',   '부동산중개',           '68221'),
  ('서비스 > 반려동물 관련', '교육·서비스',   '동물병원·펫샵',        '73100'),
  ('서비스 > 교육 (외국어)', '교육·서비스',   '학원·교습소',          '85501'),
  ('서비스 > 교육 (교과)',   '교육·서비스',   '학원·교습소',          '85501'),
  ('서비스 > 기타 서비스',   '교육·서비스',   '기타 서비스',          '96999'),
  ('도소매 > 편의점',        '도소매·판매',   '편의점',               '47122'),
  ('도소매 > 화장품',        '도소매·판매',   '화장품',               '47813'),
  ('도소매 > 의류 / 패션',   '도소매·판매',   '의류·패션',            NULL),
  ('도소매 > 농수산물',      '도소매·판매',   '청과·식자재',          '47211'),
  ('도소매 > 기타도소매',    '도소매·판매',   '기타 판매점',          NULL)
) AS m(src, main, sub, ksic)
WHERE franchise_brands.biz_type = m.src;

-- 1-c) 대분류만 확정, 소분류는 NULL로 남기는 4종
--      (categories.ts 가 category_sub = null 을 정상 상태로 허용)
UPDATE franchise_brands SET
  category_main = m.main, category_sub = NULL, ksic_code = NULL
FROM (VALUES
  ('서비스 > 이미용',      '미용·뷰티'),      -- 미용실/이발소/네일/피부 중 불명
  ('서비스 > 스포츠 관련', '오락·레저'),      -- 헬스장/골프/요가 중 불명
  ('서비스 > 기타 교육',   '교육·서비스'),    -- 학원/독서실 중 불명
  ('서비스 > 숙박',        '숙박·사무·기타')  -- 모텔·호텔/펜션 중 불명
) AS m(src, main)
WHERE franchise_brands.biz_type = m.src;

-- 1-d) 매핑 불가 7종은 손대지 않는다 (3컬럼 NULL 유지) — 대표님 판단 후 별도 UPDATE
--      서비스 > 안경 / 임대 / 인력 파견 / 운송 / 이사
--      서비스 > 유아 관련 (교육 외) / 유아관련

-- ────────────────────────────────────────────────────────────
-- 2) listings — 백필 (컬럼은 20260716 SQL에서 이미 추가됨)
-- ────────────────────────────────────────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_main TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_sub  TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ksic_code     TEXT;

-- 2-a) 평면 12종 중 소분류까지 확정되는 4종
UPDATE listings SET
  category_main = m.main, category_sub = m.sub, ksic_code = m.ksic
FROM (VALUES
  ('한식',       '요식업',      '한식',        '56111'),
  ('분식·떡볶이', '요식업',      '분식',        '56194'),
  ('의류·패션',   '도소매·판매', '의류·패션',   NULL),
  ('교육·학원',   '교육·서비스', '학원·교습소', '85501')
) AS m(src, main, sub, ksic)
WHERE listings.biz_type = m.src AND listings.category_main IS NULL;

-- 2-b) 평면 12종 중 병합 라벨 7종 — 대분류만 (소분류 복원 원리적으로 불가)
UPDATE listings SET
  category_main = m.main, category_sub = NULL, ksic_code = NULL
FROM (VALUES
  ('카페·디저트',     '카페·베이커리'),
  ('치킨·피자',       '요식업'),
  ('중식·일식·양식',  '요식업'),
  ('주점·바',         '주점'),
  ('미용·뷰티',       '미용·뷰티'),
  ('헬스·스포츠',     '오락·레저'),
  ('편의점·마트',     '도소매·판매')
) AS m(src, main)
WHERE listings.biz_type = m.src AND listings.category_main IS NULL;

-- 2-c) 프랜차이즈 문자열(C)로 저장된 매물 — franchise_brands 매핑 결과를 그대로 승계
--      (현재 실데이터 1건: '외식 > 패스트푸드')
UPDATE listings l SET
  category_main = f.category_main,
  category_sub  = f.category_sub,
  ksic_code     = f.ksic_code
FROM franchise_brands f
WHERE l.category_main IS NULL
  AND f.category_main IS NOT NULL
  AND l.biz_type = f.biz_type;

-- 2-d) '기타'(2건)와 biz_type NULL(71건)은 그대로 NULL 유지 — 정보 없음

COMMIT;

-- ────────────────────────────────────────────────────────────
-- 3) 검증 쿼리 (COMMIT 후 따로 실행)
-- ────────────────────────────────────────────────────────────

-- 3-a) 매핑 안 된 프랜차이즈 biz_type이 무엇인지 (예상: 불가 7종만 남아야 함)
-- SELECT biz_type, COUNT(*) FROM franchise_brands
-- WHERE category_main IS NULL GROUP BY biz_type ORDER BY 2 DESC;

-- 3-b) 프랜차이즈 백필 커버리지 (예상: 983/1000 — 미매핑 17건 = 불가 7종)
-- SELECT COUNT(*) FILTER (WHERE category_main IS NOT NULL) AS mapped,
--        COUNT(*) AS total FROM franchise_brands;

-- 3-c) 매물 백필 결과 (예상: 카페·디저트 6건이 카페·베이커리로, 프랜차이즈 1건 승계)
-- SELECT biz_type, category_main, category_sub, COUNT(*) FROM listings
-- GROUP BY 1,2,3 ORDER BY 4 DESC;

-- 3-d) categories.ts에 없는 대분류가 섞여 들어갔는지 (예상: 0건)
-- SELECT DISTINCT category_main FROM listings WHERE category_main NOT IN
--   ('요식업','카페·베이커리','주점','도소매·판매','미용·뷰티','오락·레저','교육·서비스','숙박·사무·기타');
