-- daily_contents: 양도자 필독(seller_guide) · 오늘의한마디(coaching) 사전 생성 저장
-- 실행 순서: Supabase SQL Editor에서 전체 실행
--
-- content_type: 'seller_guide' | 'coaching'
-- biz_type: 업종명 (null = 공통 — 업종 불문)
-- display_order: 같은 날짜·유형·업종 안에서 표시 순서 (0부터)

CREATE TABLE IF NOT EXISTS public.daily_contents (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_date   date        NOT NULL,
  content_type   text        NOT NULL CHECK (content_type IN ('seller_guide', 'coaching')),
  biz_type       text,
  body           text        NOT NULL,
  display_order  integer     NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_contents_query_idx
  ON public.daily_contents (content_date, content_type, biz_type);

-- 배치 스크립트(anon key)가 INSERT할 수 있도록 RLS 비활성화
ALTER TABLE public.daily_contents DISABLE ROW LEVEL SECURITY;
