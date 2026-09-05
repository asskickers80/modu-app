-- ORDER-address-autofill-v1 — 건축물대장 자동 채움 저장 컬럼 (대표 실행, 멈춤(a))
-- ※ 전부 신규 컬럼 추가라 실행 전에도 기존 기능이 깨지지 않는다.
--    (앱은 컬럼 부재 시 해당 키를 빼고 재시도 — lib/listings.js OPTIONAL_NEW 패턴)
-- ※ 면적(area)·층(floor)은 기존 컬럼을 그대로 쓴다 — 추가하지 않는다.

-- 1) 주소 식별자 — 건축물대장 조회 키이자 향후 인근 실거래 조회 키
alter table listings add column if not exists bjd_code text;          -- 법정동코드 10자리 (Daum bcode)
alter table listings add column if not exists postal_code text;       -- 우편번호 5자리 (Daum zonecode)
alter table listings add column if not exists building_name text;     -- 건물명 (Daum buildingName)

-- 2) 건축물대장에서 가져오는 값
alter table listings add column if not exists use_approval_date text; -- 사용승인일 YYYYMMDD (건물 연식)
alter table listings add column if not exists main_purpose text;      -- 주용도 (제1종근린생활시설 등)

-- 3) 자동 채움 출처 — "자동으로 채운 값"과 "사용자가 고친 값"을 구분해 보관
--    예: {"source":"building_registry","fetched_at":"2026-09-05T...","auto":{"floor":"1층","area":"45.2"},
--         "edited":["area"]}  → 사용자가 area만 고쳤음을 뜻한다.
--    분석·품질 점검용이며, 표시값은 언제나 기존 floor/area 컬럼이 단일 소스다.
alter table listings add column if not exists autofill jsonb;

-- 4) 검증 — 컬럼 6개가 보이면 정상 (기존 행은 전부 null)
select column_name, data_type
from information_schema.columns
where table_name = 'listings'
  and column_name in ('bjd_code','postal_code','building_name','use_approval_date','main_purpose','autofill')
order by column_name;
