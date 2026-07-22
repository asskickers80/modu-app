-- ORDER-identity-model-v1 — 대표 콘솔 실행용 SQL 모음. (a)스키마 / (b)데이터 정정.
-- 각 블록 실행 전 주석의 사전확인 쿼리로 안전 확인.

-- ═══════════════════════════════════════════════════════════
-- (b) 1. 김태우 중복 계정 통합
--   조사 결과(2026-07-22):
--     A 50302ddb…3aa780  카카오(kakao_4981577950@…internal)  생성 07-08 09:20  roles=["seller"]  연결매물 user_id 2 / device 1  ← 정본
--     B a5d1ec35…91c00f  이메일(asaskickers@naver.com)       생성 07-08 12:49  roles=NULL        연결매물 0 / 0             ← 빈 중복
--   판정: A 정본 유지, B는 데이터 0이라 이관 불필요 → 삭제.
-- ═══════════════════════════════════════════════════════════
-- 사전 확인 (0/0 이어야 안전):
SELECT (SELECT count(*) FROM listings WHERE user_id = 'a5d1ec35-4b84-4e54-a500-21fa3d91c00f') AS b_by_user,
       (SELECT count(*) FROM conversations WHERE sender_id = 'a5d1ec35-4b84-4e54-a500-21fa3d91c00f'
                                              OR receiver_id = 'a5d1ec35-4b84-4e54-a500-21fa3d91c00f') AS b_conv;
-- 위가 0/0이면 실행:
-- DELETE FROM profiles WHERE id = 'a5d1ec35-4b84-4e54-a500-21fa3d91c00f';
-- DELETE FROM auth.users WHERE id = 'a5d1ec35-4b84-4e54-a500-21fa3d91c00f';
--   (또는 Supabase 대시보드 Authentication → Users → asaskickers@naver.com → Delete)
-- 이후 로그인은 카카오로 → A(정본, 매물 2건). 이메일 로그인은 사라짐.


-- ═══════════════════════════════════════════════════════════
-- (b) 2. 고아 sender_id 진단 (정정은 케이스 확인 후)
--   참가자(문의자/소유자) 어느 쪽도 아닌 메시지 sender_id = 로그인 device 재매핑 실패 잔재.
--   렌더는 lib/conversation 참가자 기준이라 화면은 정상이나, 데이터 위생용.
-- ═══════════════════════════════════════════════════════════
SELECT m.conversation_id, m.sender_id,
       c.sender_id AS inquirer, c.receiver_id AS owner, count(*) AS n
FROM messages m JOIN conversations c ON c.id = m.conversation_id
WHERE m.sender_id <> c.sender_id AND m.sender_id <> c.receiver_id AND m.sender_id <> 'system'
GROUP BY 1,2,3,4
ORDER BY n DESC;
-- 결과가 있으면 케이스별로 대표와 확인 후 UPDATE 제시(자동 정정 금지).


-- ═══════════════════════════════════════════════════════════
-- (a) 3. 소유권 user_id 컬럼 (ownership.js user_id 우선 전환 준비)
--   migrateDeviceId가 이미 listings.user_id에 쓰지만 컬럼 미생성이면 조용히 무시됨 → 명시 생성.
--   landlord-persist-v1 스키마와 별개(이미 실행됐다면 이 블록만).
-- ═══════════════════════════════════════════════════════════
ALTER TABLE listings ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS listings_user_id_idx ON listings(user_id);
-- (정식 FK·RLS는 LOGIN-DEBT의 '정식 RLS' 착수 시. 지금은 컬럼만.)
-- 확인:
SELECT count(*) AS with_user_id FROM listings WHERE user_id IS NOT NULL;
