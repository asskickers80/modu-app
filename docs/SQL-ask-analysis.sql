-- ORDER 2026-09-13 파트 C3 — 월간 분석 리포트 쿼리 3개 (읽기 전용. 원문 없이 집계만 본다)
-- 남의 수치(다른 플랫폼 사례)는 화면·문서 어디에도 쓰지 않는다.

-- 1) 상위 질문 주제 × 업종 × 지역 — 어디서 뭘 궁금해하는지 (템플릿 풀 갱신 근거)
select month, topic_axis, industry_code, region_code, sum(count) as n
from ask_question_facts
where month >= date_trunc('month', now() - interval '3 months')
group by 1, 2, 3, 4
order by n desc
limit 50;

-- 2) ② 비율 상위 — 우리가 못 답하는 것 순위 (분기 1회 등록 폼 기본 항목 승격 안건의 유일한 근거)
select topic_axis,
       sum(count) filter (where branch = 'owner') as owner_n,
       sum(count) as total_n,
       round(100.0 * sum(count) filter (where branch = 'owner') / nullif(sum(count), 0), 1) as owner_pct
from ask_question_facts
where month >= date_trunc('month', now() - interval '3 months')
group by 1
order by owner_pct desc nulls last;

-- 3) 질문 → 문의 전환율 추이 (축별·업종별) + 주인 답장률·대화 전환율
select month, topic_axis, industry_code,
       sum(count) as questions,
       round(100.0 * sum(count) filter (where converted_to_inquiry) / nullif(sum(count), 0), 1) as to_inquiry_pct,
       round(100.0 * sum(count) filter (where owner_replied) / nullif(sum(count) filter (where branch = 'owner'), 0), 1) as owner_reply_pct,
       round(100.0 * sum(count) filter (where opened_to_dm) / nullif(sum(count) filter (where owner_replied), 0), 1) as opened_pct
from ask_question_facts
group by 1, 2, 3
order by month desc, questions desc
limit 100;
