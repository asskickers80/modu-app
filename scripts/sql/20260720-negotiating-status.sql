-- A. 협의중(negotiating) status 도입 + D. 고아 대화 정리
-- 실행: Supabase 콘솔 SQL Editor (프로젝트 edcqvmgqskeoegpqxlzy 확인 후)
-- 오더: docs/ORDER-guide-status-cleanup.md
--
-- ※ 조사 결과 listings.status 에는 CHECK 제약도 enum 타입도 **없다**.
--   (임의 문자열이 그대로 저장되는 것을 실제로 확인함 — 아래 1) 참조)
--   따라서 'negotiating' 값 추가 자체는 스키마 변경이 필요 없고,
--   이 SQL의 실질은 "지금까지 없던 제약을 새로 거는 것"이다.
-- ※ 순서 중요: 잘못된 값을 먼저 지운 뒤에 CHECK 를 걸어야 한다.

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1) 조사 중 잘못 들어간 probe 행 삭제 (작업자 실수 — 아래 참조)
--    status 제약 유무를 확인하려고 INSERT 를 시도했는데 제약이 없어
--    그대로 저장됐다. anon 롤은 DELETE 권한이 없어 앱에서 지울 수 없다.
--    device_id 가 없어 어느 화면에도 노출되지 않지만 반드시 정리한다.
-- ────────────────────────────────────────────────────────────
DELETE FROM listings WHERE id = '24d38d8a-e213-4873-ae15-af146b05a738';

-- ────────────────────────────────────────────────────────────
-- 2) 고아 대화 정리 (D)
--    이 행은 listing_id 가 '없는 id'가 아니라 **NULL** 이다.
--    따라서 `listing_id NOT IN (SELECT id FROM listings)` 로는 잡히지 않는다
--    (NULL NOT IN … 은 TRUE 가 아니라 NULL). IS NULL 을 함께 봐야 한다.
-- ────────────────────────────────────────────────────────────
DELETE FROM messages
WHERE conversation_id = '740430b0-e64a-40f9-8ec7-cebf2704fc1d';

DELETE FROM conversations
WHERE id = '740430b0-e64a-40f9-8ec7-cebf2704fc1d';

-- 같은 형태가 더 있으면 함께 정리 (지금은 위 1건뿐)
DELETE FROM messages WHERE conversation_id IN (
  SELECT c.id FROM conversations c
  WHERE c.listing_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM listings l WHERE l.id = c.listing_id)
);
DELETE FROM conversations c
WHERE c.listing_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM listings l WHERE l.id = c.listing_id);

-- ────────────────────────────────────────────────────────────
-- 3) listings.status 에 CHECK 제약 신설 — 협의중 포함 5종
--    지금은 제약이 없어 오타 값이 조용히 저장된다 (1번이 그 증거).
-- ────────────────────────────────────────────────────────────
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('published', 'negotiating', 'hidden', 'completed', 'example'));

COMMIT;

-- ────────────────────────────────────────────────────────────
-- 4) 검증 쿼리 (COMMIT 후 따로 실행)
-- ────────────────────────────────────────────────────────────

-- 4-a) status 분포 — 기대: hidden 3 / published 10 (probe 행 사라짐)
-- SELECT status, COUNT(*) FROM listings GROUP BY status ORDER BY 2 DESC;

-- 4-b) 고아 대화 — 기대: 0행
-- SELECT c.id, c.listing_id FROM conversations c
-- WHERE c.listing_id IS NULL
--    OR NOT EXISTS (SELECT 1 FROM listings l WHERE l.id = c.listing_id);

-- 4-c) 제약이 실제로 걸렸는지 — 기대: ERROR (violates check constraint)
-- INSERT INTO listings (shop_name, status) VALUES ('__check_test__', '__bad__');

-- ────────────────────────────────────────────────────────────
-- 5) 재발 방지 — 제시만 (실행 여부는 대표님 판단)
-- ────────────────────────────────────────────────────────────
-- 현재 앱 코드(E2PropertyDetail handleStartDm)는 항상 listing_id 를 채우므로
-- 새 고아는 생기지 않는다. 위 1건은 2026-07-01 옛 코드 흔적이다.
-- 구조적으로 막으려면 FK + NOT NULL 이 필요한데, 매물이 삭제될 때
-- 대화를 함께 지울지(CASCADE) 남길지는 제품 판단이라 실행하지 않는다.
--
-- ALTER TABLE conversations ALTER COLUMN listing_id SET NOT NULL;
-- ALTER TABLE conversations ADD CONSTRAINT conversations_listing_fk
--   FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
--
-- ※ CASCADE 를 걸면 매물 삭제 시 그 대화·메시지가 함께 사라진다.
--   더미 정리처럼 대량 삭제를 또 할 계획이면 영향 범위를 먼저 확인할 것.
