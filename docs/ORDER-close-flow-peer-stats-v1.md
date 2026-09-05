# [ORDER-close-flow-peer-stats-v1] 매물 마감 흐름 + 알림 센터 + 문의 동향 카드 (양도인·소유주)

■ 저장 지시: docs/ORDER-close-flow-peer-stats-v1.md 저장.
■ 모드: 자율 판정. 멈춤 (a)스키마 SQL (b)실DB 정정 (c)판정 불가만.
■ 장치 3: 양도인 경로 직접 수정이므로 e1-seller-snapshot 착수 전 그린 확인 → 보고에
   양도인 영향 diff 요약 의무. AI 호출 없음 — 전부 룰과 카운팅.
■ 원문: 대표가 리서치 세션에서 작성한 지시문(내리기 3단계 + 문의 통계)을 앱 현행 구조에
   맞게 조정한 것. 아래가 유일본.

■ 0. 어휘 규칙 (양축 차등 — 전 문안 적용)
- 양도인: "매물" · "권리금" · "동향" ("동종·동일 상권·비슷한 매물 동향")
- 소유주: "상가" · "매매가/임대료" · "시세"
- "가게" 단어 금지(이 오더 문안 전체). 큰 글씨, 칩 선택 위주, 모두 화법.

■ 1. 선행 — 이벤트 로깅 인프라 (Day-1 로깅)
events 테이블 신설(user_id, listing_id nullable, event_name, payload jsonb, created_at).
공용 logEvent() 1개. 이 오더의 모든 이벤트가 여기로. 스키마 SQL(a).

■ 2. 매물 마감 흐름 (E2·E2L 소유자 액션)
기존 두 버튼 유지: "잠깐 숨기기"(hidden, 복구 가능) / "매물(상가) 내리기 (삭제하기)".
변경은 후자 탭 시 동작만.

[1단계] 시트 제목 "매물(상가)을 내리시는군요. 어떻게 됐어요?" — 보상 언급 절대 없음.
칩 3개: 팔렸어요(소유주: 임대는 "임차인 구했어요"·매각은 "팔렸어요" — deal_type 분기) /
잠깐 쉴게요 / 계속 운영하기로 했어요(소유주: "계속 보유하기로 했어요").
하단 텍스트 링크 "그냥 삭제할게요" → 기존 확인 다이얼로그 → deleted (질문 없이 종료).
X로 닫으면 무변경.
상태 매핑: 팔렸어요 → status='sold' (신설, 탐색·홈 목록 제외·데이터 보존 — 동향 재료) /
잠깐 쉴게요 → 기존 hidden 재사용 (paused 신설 안 함) / 계속 운영 → deleted + 사유 기록.
status CHECK 제약에 sold 추가 SQL(a). listing_close_surveys 테이블(listing_id, user_id,
close_reason, final_price_band, deal_channel, next_plan, created_at) SQL(a).

[2단계 — 팔렸어요만] "축하드려요. 두 가지만 알려주시면 프리미엄 1개월을 드릴게요."
- 최종 가격: 처음 가격 그대로 / 10% 이내 조정 / 10~30% 조정 / 30% 이상 조정
  → final_price_band(same/adj_10/adj_10_30/adj_30plus)
- 어디서 만난 분: 모두에서 / 부동산 / 지인·직거래 → deal_channel(modu/broker/direct)
둘 다 선택 → [완료] → premium_grants(user_id, days=30, reason='sold_survey', granted_at,
expires_at; 기존 유효분 있으면 만료 +30일) 저장 + 토스트 "프리미엄 1개월이 적용됐어요".
※ 프리미엄은 대표 결정으로 더미 진행 — 부여·표시 로직만, 실효(해제 기능)는 상품 구성 후
  연결. 마이 화면에 "프리미엄 ~까지" 표시 1줄. premium_grants SQL(a).
마무리 안내 카드(원천징수 8.8%·부가세/포괄양수도·폐업 신고·보증금 반환·시설 인도)는
문안 도착 전까지 미노출(껍데기 금지) — 컴포넌트·슬롯만 준비.
쉴게요/계속 운영은 2단계 건너뜀.

[3단계 — 알림 신청, 전부 건너뛰기 가능]
- 팔렸어요 → "다음은 어떻게 하실 계획이세요?" 칩: 다른 매물 찾을 거예요 / 다른 점포
  운영 중이에요 / 당분간 쉴 거예요 / 아직 몰라요 → next_plan
  · 찾을 거예요 → "어느 동네, 어떤 업종이면 알려드릴까요?" (A3 RegionPicker·IndustryPicker
    재사용) → 창업준비 프로필 없으면 completeLoggedInRoleAdd로 생성 + 희망 조건 저장
  · 운영 중 → "그 점포 임대차 만료가 언제예요?" (월 선택) → 사장님 프로필
    roleData.operating.lease_end_date (없으면 생성). 새 컬럼 아님 — 축별 분리 구조 준수.
- 잠깐 쉴게요 → "언제쯤 다시 올려드릴까요?" 한 달 뒤 / 명절 지나고(다음 설·추석 +3일,
  공휴일 테이블 상수) / 내가 정할게요 → repost_remind_at
  + 토글: 양도인 "쉬는 동안 비슷한 매물 동향 알려드릴까요?" / 소유주 "쉬는 동안 이 상권
  시세 알려드릴까요?" → alert_peer_trend
- 계속 운영 → 토글: 양도인 "내 매물 동향이 바뀌면 알려드릴까요?" / 소유주 "상가 시세가
  오르내리면 알려드릴까요?" → alert_my_value + "임대차 만료가 언제예요?" → lease_end_date
알림 설정은 roleData 해당 축 하위에 저장(seller/landlord/operating).
마지막 화면 "알려드릴게요. 고생 많으셨어요." 후 닫힘.
이벤트: close_flow_open, close_reason_selected(reason), sold_survey_completed(band,channel),
premium_granted, next_plan_selected(plan), alert_opt_in(type), close_flow_skipped(step).

■ 3. 알림 센터 — 정식 구현 (대표 결정: (예정) 아님, 필수 기능)
notifications 테이블(user_id, type, title, body, payload jsonb, scheduled_at, sent_at,
read_at, created_at) SQL(a). "모두 발송 알림" 전용(사용자 간 활동 제외 — 벨 원칙 유지).
- 벨 UnreadDot = 미읽음 notifications 존재. 탭 → 알림 목록 화면 실구현((예정) 안내 교체).
- 생성 룰(일 1회 크론, 기존 Vercel Cron 패턴): repost_remind_at 도달 → "다시 올릴 때가
  됐어요" / lease_end_date D-180·D-90·D-30 → 임대차 만료 안내 / alert_peer_trend·
  alert_my_value → 동향·시세 표본이 충족될 때만 생성(표본 미충족 시 생성 안 함 — 가짜
  알림 금지, 4번 표본 기준 공유).
- 알림 목록 항목 탭 → 관련 화면 딥링크(재등록→E1/E1p, 만료→사장님 홈, 동향→4번 카드).
- docs/NOTIFICATION-CENTER-PLAN.md 갱신: 이번 구현분 반영.

■ 4. 문의 동향 카드 + 차이 시트 (양도인 홈·E2 소유자 / 소유주 홈·E2L 소유자)
원칙: 카드 = 숫자 하나 + 근거 한 줄. 탭 → 시트에서 할 일만.
카드 3줄: "비슷한 매물(상가)은 첫 문의까지 평균 {N}일 / {범위} {M}건 기준 · 내 매물은
등록 {D}일째"
비교군 확장 getPeerInquiryStats(listing_id): 첫 문의 받은 매물 ≥5건인 가장 좁은 단계.
- 양도인: 동×업종소분류×평수±30% → 구×업종 → 시도×업종 → 전국×업종 → 전국×대분류
- 소유주: 동×deal_type×면적±30% → 구×deal_type → 시도×deal_type → 전국×deal_type
최근 180일, status='example' 제외, 결과 매물별 1시간 캐시. published_at 컬럼 유무 확인 —
없으면 SQL(a)로 추가 + 기존 행은 created_at으로 백필.
※ 폴백: 5단계까지 <5건이면 카드 미표시. "문의를 받으려면" 대체 카드 만들지 않음 —
  비교군 없는 힌트는 기존 가이드+완성도 카드가 담당(중복 금지). 표본 생기면 자동 등장.
시트: "문의 받은 {M}건과 내 매물의 차이" — 차이 큰 순 최대 3개(비교군 충족 ≥60% & 내
매물 미충족): 사진 수 / 월매출 입력(양도인만) / 가격 위치(양도인=권리금이 sold 표본
final_price_band 분포 대비, 소유주=국토부 실거래 대비; 각 표본 <5건이면 항목 스킵) /
특이사항 / 잔여 계약기간(양도인만). 차이 0개 → "비슷한 매물과 다른 점이 없어요. 문의는
보통 {N}일 안에 와요." [그대로 둘게요] = 30일 숨김. 하단 접힘 "이 매물은 이렇게 했어요"
익명 1건(링크·상호·주소 없음).
승격: 등록 21일+문의 0 → 카드를 홈 객체 카드 바로 아래로 올리고 시트 내용 펼침
(양도인 홈에 "오늘 할 일" 없음 — 원문 위치 지시 무효).
이벤트: peer_stats_shown(stage,M,N), peer_stats_null, gap_sheet_open, gap_item_shown,
gap_action, gap_dismissed, example_expanded.

■ 순서
1(로깅) → 2(마감 흐름) → 3(알림 센터) → 4(동향 카드). SQL은 항목별 제시·대기·진행.
SQL 미실행 상태에서 배포되어도 기존 기능이 깨지지 않게(스키마 의존 배포 규칙).

■ 테스트
2: 팔렸어요→sold+설문+premium 30일 / 기존 프리미엄 +30 / 쉴게요→hidden+repost_remind /
계속 운영→deleted+사유 / 그냥 삭제→질문 없이 deleted / X→무변경 / 3단계 스킵→survey
남고 알림 null / 소유주 deal_type별 칩 문안 / 프로필 생성이 roleData 구조 준수.
3: 알림 생성 룰 3종 / 벨 점·목록·읽음 / 표본 미충족 시 동향 알림 미생성.
4: 5단계 확장 각 라벨 / 전부 부족→카드 없음(대체 카드 없음) / 표본<5 항목 스킵 /
21일 승격 / example 제외 / 양축 어휘. 전체 스위트.

■ 보고: 4줄(ls-remote) + SQL 전문(항목별) + 양도인 diff 요약 + 알림 생성 룰 표 +
   어휘 적용표(양도인/소유주).
