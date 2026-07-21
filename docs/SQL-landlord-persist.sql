-- ORDER-landlord-persist-v1 파트1 스키마 — 대표 콘솔에서 실행 후 코드 배포.
-- listings 테이블 재사용(방법 A). 기존 seller 행은 default로 무영향.

-- ── 1) 구분 컬럼 ──────────────────────────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'seller';
-- CHECK (이미 있으면 스킵)
DO $$ BEGIN
  ALTER TABLE listings ADD CONSTRAINT listings_listing_type_chk CHECK (listing_type IN ('seller','landlord'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2) 임대인 전용 nullable 필드 (재사용 컬럼은 신설하지 않음 — 아래 매핑표) ──
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deal_type text;         -- 'lease'|'sale'|'both'
DO $$ BEGIN
  ALTER TABLE listings ADD CONSTRAINT listings_deal_type_chk CHECK (deal_type IS NULL OR deal_type IN ('lease','sale','both'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sale_price text;        -- 희망 매매가
ALTER TABLE listings ADD COLUMN IF NOT EXISTS cap_rate text;          -- 캡레이트/수익률
ALTER TABLE listings ADD COLUMN IF NOT EXISTS recommended_biz jsonb DEFAULT '[]'::jsonb; -- 권장 업종(다중)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS available_from text;    -- 입주 가능 시점 (E1p 현재 미수집 — 향후)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rights_info text;       -- 권리관계 (E1p 현재 등기 더미)

-- ── 3) status CHECK ──────────────────────────────────────────
-- 기존 5종(published/negotiating/completed/hidden/example)이 임대인에도 그대로 유효.
-- (공개/협의중/계약완료/숨김/예시 모두 상가에 의미 성립) → 변경 없음.

-- ── 4) 기존 seller 행 무영향 확인 (읽기) ─────────────────────
-- 모두 'seller' 여야 하고 NULL 0:
SELECT listing_type, count(*) FROM listings GROUP BY 1;
SELECT count(*) AS null_type FROM listings WHERE listing_type IS NULL;


/*
컬럼 매핑표 (임대인 필드 → listings 컬럼 : 재사용 R / 신설 N / 미수집 -)
  임대/매각 구분(rent/sale/both) → deal_type            N  (E1p 'rent'→'lease' 매핑)
  주소                          → address               R
  층                            → floor                 R
  면적                          → area                  R
  보증금                        → deposit               R
  월세                          → monthly_rent          R
  관리비                        → maintenance           R
  희망 매매가                   → sale_price            N
  캡레이트/수익률               → cap_rate              N
  권장 업종(다중)               → recommended_biz       N (jsonb)
  입주 가능 시점                → available_from        N (E1p 폼 미수집 → null)
  권리관계                      → rights_info           N (E1p 등기 더미 → null)
  상가명/상호                   → shop_name             R
  소개글(초안·검수)             → ai_draft/review_choices/edited_texts  R
  사진(도면·외관·내부)          → image_urls/interior_image_urls/exterior_image_urls  R
  소유권                        → device_id             R (lib/ownership.isOwnerOf 재사용)
  상태                          → status                R (기존 CHECK 5종)
  소유자 닉네임                 → owner_nickname        R
  구분                          → listing_type          N ('landlord')
  * 미사용(landlord=null): transfer_fee, transfer_type, monthly_sales, biz_type,
    category_main/sub, ksic_code, franchise_*, business_number, sales_proof, facilities
  * 사업자번호 게이트: 임대인 E1pStep5는 '휴대폰 본인인증(더미)'만 사용, 사업자번호 미수집
    → 사업자 게이트 비적용(business_number=null). E1 seller 코드와 분리돼 있어 우회 불필요.
*/
