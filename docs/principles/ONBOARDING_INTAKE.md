# 질문형(말로 하기) 온보딩 규칙

1. AI 호출은 온보딩 1회 + 사용자가 [다시 말할게요]를 누를 때만. 피드·매칭·알림·매출 분석 배치는 구조화 필드 위에서 알고리즘으로 돈다. AI는 생성만, 선별은 알고리즘.
2. 저장은 구조화 조건 필드 + 원문 최대 500자. 대화 전체 기록(transcript)·임베딩·벡터 저장 금지.
3. 성과 지표는 세 개를 따로 집계하고 필터 입력 사용자와 비교한다: 프로필 항목 충족률 / 맞춤 피드 클릭률 / 문의 전환. 질문형 입력의 성과를 문의 전환 하나로 판단하지 않는다.
4. 이벤트 스키마(구현 시 그대로 사용): intake_start(axis, mode: voice|text|filter), intake_complete(axis, mode, fields_filled, fields_total, chars), intake_retry(axis), feed_click(axis, mode, listing_id), inquiry_from_intake(axis, mode).
5. 비용 상한: 온보딩 1건 입력 8,000토큰·출력 1,000토큰을 넘는 프롬프트는 만들지 않는다. 초과 시 원문을 500자로 자른다.
