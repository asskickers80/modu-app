-- ORDER-profile-data-split-v1 — profile_data 축별 사업체 정보 분리 (대표 실행, 멈춤(a))
-- 구조: profile_data.roleData.{seller|operating|landlord} = { category_main, category_sub,
--       ksic_code, bizType, bizLabel, region, region_sub, transfer_priority, sales, status, count }
-- 귀속 기준: 현재 활성 축(profiles.category) — 마지막 저장 값은 활성 축의 온보딩/수정에서 온 값.
-- ※ 앱은 SQL 실행 전에도 동작한다(읽기 폴백 + lazy 이관 — 스키마 의존 배포 규칙).
--    이 SQL은 서버 데이터 정합 정리용. 스키마(컬럼) 변경 없음 — jsonb 내부 구조만.

-- 0) 대상 행 수 확인 (실행 전)
SELECT count(*) AS target_rows
FROM profiles
WHERE category IN ('seller', 'operating', 'landlord')
  AND profile_data IS NOT NULL
  AND NOT (profile_data ? 'roleData');

-- 1) 이관 — flat 사업체 필드를 roleData[활성 축]으로 옮기고 flat에서 제거
UPDATE profiles
SET profile_data =
  (profile_data - ARRAY['category_main','category_sub','ksic_code','bizType','bizLabel',
                        'region','region_sub','transfer_priority','sales','status','count'])
  || jsonb_build_object('roleData', jsonb_build_object(
       category,
       COALESCE((
         SELECT jsonb_object_agg(k, profile_data -> k)
         FROM unnest(ARRAY['category_main','category_sub','ksic_code','bizType','bizLabel',
                           'region','region_sub','transfer_priority','sales','status','count']) AS k
         WHERE profile_data ? k
       ), '{}'::jsonb)
     ))
WHERE category IN ('seller', 'operating', 'landlord')
  AND profile_data IS NOT NULL
  AND NOT (profile_data ? 'roleData');

-- 2) 검증 (실행 후) — roleData 생성 행 수 + 샘플
SELECT count(*) FROM profiles WHERE profile_data ? 'roleData';
SELECT id, category, profile_data FROM profiles WHERE profile_data ? 'roleData' LIMIT 5;
