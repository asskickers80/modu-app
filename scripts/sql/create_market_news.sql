-- market_news: 업종별 시장 동향 뉴스 캐시 (네이버 검색 API 수집)
-- 실행 순서: Supabase SQL Editor에서 전체 실행
--
-- biz_type: 업종명 (null = 공통·전체), daily_contents 와 동일한 업종 코드
-- link: 실제 기사 원문 링크 (originallink 우선, 없으면 네이버 캐시 link)
-- collected_at: 배치 실행 시각 — 업종별 최신 N건 조회에 사용

CREATE TABLE IF NOT EXISTS public.market_news (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  biz_type     text,
  keyword      text        NOT NULL,
  title        text        NOT NULL,
  description  text,
  link         text        NOT NULL,
  pub_date     text,
  collected_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_news_biz_type_idx
  ON public.market_news (biz_type, collected_at DESC);

-- 배치 스크립트(anon key)가 INSERT/DELETE할 수 있도록 RLS 비활성화
ALTER TABLE public.market_news DISABLE ROW LEVEL SECURITY;
