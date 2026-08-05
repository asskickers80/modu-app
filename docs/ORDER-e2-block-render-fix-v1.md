# [ORDER-e2-block-render-fix-v1] E2 광고에 입지 블록 미표시 — 블록 렌더 전수 대조

## 원인 특정
E2의 blockText('location_spot')가 ai_draft['location_spot']을 조회하지만 초안 저장 키는
'locationSpot'(camelCase — Gemini 응답 스키마) → 항상 null. E2L rent/sale_market 미렌더와
동형(키 배선 누락) 결함.

## 수정
- E2 blockText에 draftKey 매핑 인자 추가 — location_spot ↔ locationSpot 폴백.
- 3자 대조: 블록 빌더 id를 소스에서 자동 추출해 E2/E2L 렌더 배선과 대조하는
  block-render-parity 테스트 신설 — 새 블록 추가 시 배선 누락이면 블록명 지목 실패.
  예외(location=팩트 그리드, market_data/insight=실시세 카드 대체)는 사유 명시 목록.
- 섹션 탭 연동: 입지 블록 표시/비공개 시 spot 탭 노출/미노출 검증.
