-- ORDER-e1p-shell-eliminate-v2 — 소프트 삭제 상태 추가. 대표 콘솔 실행.
-- status CHECK 5종에 'deleted' 추가 (E2L 삭제하기 = 소프트 삭제).
-- 하드 삭제(DELETE row)는 conversations FK 정책 미확정 + RLS DELETE 차단 전제라 보류 —
-- deleted는 탐색(status 필터)·홈 목록·상세에서 전부 제외되는 영구 비노출 상태.

-- 기존 status CHECK 제약을 이름 무관하게 찾아 드롭 후 재생성 (제약 이름 기록이 없어 동적 처리)
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'listings'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE listings DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('published','negotiating','completed','hidden','example','deleted'));

-- 확인:
SELECT status, count(*) FROM listings GROUP BY 1 ORDER BY 1;
