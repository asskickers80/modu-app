-- 업종 분류 통일 1단계 — 스키마 + 백필 (확정판)
-- 실행: Supabase 콘솔 SQL Editor (프로젝트 edcqvmgqskeoegpqxlzy 확인 후)
-- 근거·매핑 판단: docs/BIZTYPE-UNIFY-STEP0.md / 확정 판단: docs/ORDER-biztype-unify-step1.md
--
-- ※ listings의 3컬럼은 20260716-industry-category-columns.sql 에서 이미 추가됨(실DB 확인).
--   여기서는 안전망으로 IF NOT EXISTS만 두고, 실질 작업은 백필 UPDATE.
-- ※ 기존 biz_type 컬럼은 삭제하지 않는다 (병행 기간 — 표시·필터가 계속 사용).
-- ※ 대상 규모: franchise_brands 11,683건 / 고유 biz_type 44종 (2026-07-20 전량 실측)
-- ※ 대표 판단 반영: 안경점·약국 소분류 신설 / 비점포 업종은 대분류만 /
--   유아관련 2종 → 교육·서비스 대분류만 / '서비스 > 임대'는 업태별 분할

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

-- 1-b) 소분류까지 확정 (34종)
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
  ('서비스 > 배달',          '요식업',        '배달·포장 전문',       '56199'),
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
  ('서비스 > 약국',          '교육·서비스',   '약국',                 NULL),
  ('도소매 > 편의점',        '도소매·판매',   '편의점',               '47122'),
  ('도소매 > 화장품',        '도소매·판매',   '화장품',               '47813'),
  ('도소매 > 의류 / 패션',   '도소매·판매',   '의류·패션',            NULL),
  ('도소매 > 농수산물',      '도소매·판매',   '청과·식자재',          '47211'),
  ('도소매 > 기타도소매',    '도소매·판매',   '기타 판매점',          NULL),
  ('서비스 > 안경',          '도소매·판매',   '안경점',               NULL)
) AS m(src, main, sub, ksic)
WHERE franchise_brands.biz_type = m.src;

-- 1-c) 대분류만 확정, 소분류 NULL (9종)
--      categories.ts 가 category_sub = null 을 정상 상태로 허용
UPDATE franchise_brands SET
  category_main = m.main, category_sub = NULL, ksic_code = NULL
FROM (VALUES
  ('서비스 > 이미용',              '미용·뷰티'),     -- 미용실/이발소/네일/피부 중 불명
  ('서비스 > 스포츠 관련',         '오락·레저'),     -- 헬스장/골프/요가 중 불명
  ('서비스 > 기타 교육',           '교육·서비스'),   -- 학원/독서실 중 불명
  ('서비스 > 숙박',                '숙박·사무·기타'),-- 모텔·호텔/펜션 중 불명
  ('서비스 > 유아 관련 (교육 외)', '교육·서비스'),   -- 대표 판단: 키즈카페 계열 포함해 교육·서비스로
  ('서비스 > 유아관련',            '교육·서비스'),   -- 위와 동일 계열 (표기 흔들림)
  ('서비스 > 인력 파견',           '교육·서비스'),   -- 비점포 업종 — 소분류 신설 없이 대분류만
  ('서비스 > 운송',                '교육·서비스'),   -- 비점포 업종
  ('서비스 > 이사',                '교육·서비스'),   -- 비점포 업종
  ('도소매 > (건강)식품',          '도소매·판매'),   -- 반찬/건강기능식품 혼재 — 소분류 불명
  ('도소매 > 종합소매점',          '도소매·판매')    -- 슈퍼/드럭스토어 혼재 — 소분류 불명
) AS m(src, main)
WHERE franchise_brands.biz_type = m.src;

-- 1-d) '서비스 > 임대' (25건) — 대표 판단: 업태별 분할
--      브랜드명·가맹본부명 키워드로 판정. 아래 어디에도 안 걸리는 잔여는 1-e에서 대분류만.
UPDATE franchise_brands SET
  category_main = '요식업', category_sub = '배달·포장 전문', ksic_code = '56199'
WHERE biz_type = '서비스 > 임대'
  AND (brand_name ILIKE '%주방%' OR brand_name ILIKE '%키친%' OR brand_name ILIKE '%kitchen%');

UPDATE franchise_brands SET
  category_main = '교육·서비스', category_sub = '독서실·스터디카페', ksic_code = '90212'
WHERE biz_type = '서비스 > 임대'
  AND (brand_name ILIKE '%스터디%' OR brand_name ILIKE '%독서실%');

UPDATE franchise_brands SET
  category_main = '숙박·사무·기타', category_sub = '사무실', ksic_code = NULL
WHERE biz_type = '서비스 > 임대'
  AND category_main IS NULL
  AND (brand_name ILIKE '%오피스%' OR brand_name ILIKE '%office%'
       OR brand_name ILIKE '%워크%' OR brand_name ILIKE '%work%'
       OR franchisor ILIKE '%공유오피스%');

UPDATE franchise_brands SET
  category_main = '숙박·사무·기타', category_sub = '공장·창고', ksic_code = NULL
WHERE biz_type = '서비스 > 임대'
  AND category_main IS NULL
  AND (brand_name ILIKE '%스토리지%' OR brand_name ILIKE '%storage%'
       OR brand_name ILIKE '%박스%' OR brand_name ILIKE '%카고%');

UPDATE franchise_brands SET
  category_main = '오락·레저', category_sub = '헬스장', ksic_code = '91132'
WHERE biz_type = '서비스 > 임대'
  AND category_main IS NULL
  AND (brand_name ILIKE '%짐%' OR brand_name ILIKE '%gym%');

UPDATE franchise_brands SET
  category_main = '오락·레저', category_sub = '스크린골프', ksic_code = '91136'
WHERE biz_type = '서비스 > 임대'
  AND category_main IS NULL
  AND brand_name ILIKE '%골프%';

-- 1-e) 임대 잔여 — 전부 '공간 대여'라는 점은 확실하므로 대분류만 (파티룸·스튜디오 등)
UPDATE franchise_brands SET
  category_main = '숙박·사무·기타', category_sub = NULL, ksic_code = NULL
WHERE biz_type = '서비스 > 임대' AND category_main IS NULL;

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
  ('한식',        '요식업',      '한식',        '56111'),
  ('분식·떡볶이', '요식업',      '분식',        '56194'),
  ('의류·패션',   '도소매·판매', '의류·패션',   NULL),
  ('교육·학원',   '교육·서비스', '학원·교습소', '85501')
) AS m(src, main, sub, ksic)
WHERE listings.biz_type = m.src AND listings.category_main IS NULL;

-- 2-b) 평면 12종 중 병합 라벨 7종 — 대분류만 (소분류 복원 원리적으로 불가)
--      → 이 매물들이 '재질문 대상'. 소유자 응답 전까지 category_sub = NULL 유지.
UPDATE listings SET
  category_main = m.main, category_sub = NULL, ksic_code = NULL
FROM (VALUES
  ('카페·디저트',    '카페·베이커리'),
  ('치킨·피자',      '요식업'),
  ('중식·일식·양식', '요식업'),
  ('주점·바',        '주점'),
  ('미용·뷰티',      '미용·뷰티'),
  ('헬스·스포츠',    '오락·레저'),
  ('편의점·마트',    '도소매·판매')
) AS m(src, main)
WHERE listings.biz_type = m.src AND listings.category_main IS NULL;

-- 2-c) 프랜차이즈 문자열(C)로 저장된 매물 — franchise_brands 매핑 결과를 승계
--      (현재 실데이터 1건: '외식 > 패스트푸드')
UPDATE listings l SET
  category_main = f.category_main,
  category_sub  = f.category_sub,
  ksic_code     = f.ksic_code
FROM (
  SELECT DISTINCT ON (biz_type) biz_type, category_main, category_sub, ksic_code
  FROM franchise_brands
  WHERE category_main IS NOT NULL
  ORDER BY biz_type, category_sub NULLS LAST
) f
WHERE l.category_main IS NULL AND l.biz_type = f.biz_type;

-- 2-d) '기타'(2건)와 biz_type NULL(71건)은 그대로 NULL 유지 — 정보 없음

COMMIT;

-- ────────────────────────────────────────────────────────────
-- 3) 검증 쿼리 (COMMIT 후 따로 실행)
-- ────────────────────────────────────────────────────────────

-- 3-a) 프랜차이즈 백필 커버리지 — 기대: mapped 11683 / total 11683 (미매핑 0)
-- SELECT COUNT(*) FILTER (WHERE category_main IS NOT NULL) AS mapped,
--        COUNT(*) AS total FROM franchise_brands;

-- 3-b) 매핑 안 된 값이 남았는지 — 기대: 0행
-- SELECT biz_type, COUNT(*) FROM franchise_brands
-- WHERE category_main IS NULL GROUP BY biz_type ORDER BY 2 DESC;

-- 3-c) 매물 백필 결과 — 기대: 백필 9건(카페·디저트 6 + 프랜차이즈 1 + 기타 2는 NULL 유지),
--      그중 재질문 대상 6건(카페·디저트 = category_main 있고 category_sub NULL)
-- SELECT biz_type, category_main, category_sub, COUNT(*) FROM listings
-- GROUP BY 1,2,3 ORDER BY 4 DESC;

-- 3-d) 재질문 대상 매물 수 — 기대: 6
-- SELECT COUNT(*) FROM listings
-- WHERE category_main IS NOT NULL AND category_sub IS NULL AND status <> 'example';

-- 3-e) categories.ts에 없는 대분류가 섞여 들어갔는지 — 기대: 0행
-- SELECT DISTINCT category_main FROM franchise_brands WHERE category_main NOT IN
--   ('요식업','카페·베이커리','주점','도소매·판매','미용·뷰티','오락·레저','교육·서비스','숙박·사무·기타');
