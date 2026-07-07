-- [실행 보류] 대표님 Supabase 콘솔에서 직접 실행
-- listings 테이블에 항목별 공개여부 JSONB 컬럼 추가
-- {} = 전체 공개 (기본값), { blockId: false } = 해당 블록 비공개
ALTER TABLE listings ADD COLUMN IF NOT EXISTS item_visibility JSONB DEFAULT '{}';
