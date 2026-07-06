# 세션 핸드오버 — 2026-07-06

> 다음 세션 시작 시 이 파일 먼저 읽고 이어서 작업.

---

## 이번 세션에서 완료된 것

### 7/6 오늘 세션

| 항목 | 요약 |
|------|------|
| E1 시설·집기 직접입력 통합 | 직접 입력한 항목이 화면 칩에 미표시되던 버그 수정. 프리셋+커스텀 통합 칩 영역(탭하면 취소). 테스트 4건 |
| 탐색탭 시장조사 모드 칩 상태 로직 | `disabled` 양면(시각+기능) 수정. myListing 판정 `published`/`hidden`만으로 통일(`example` 제외). 신규·example-only 사용자 3칩 비활성 테스트 추가 |
| 데이터 위생 절차 확립 | 잔재 발견 → SELECT로 식별 → 백업 JSON → id 지정 DELETE → SELECT로 실증. 33건+2건 삭제(모두 `서교동 고양이 카페` Playwright 잔재) |
| 테스트 DB 격리 전역 차단 | `tests/fixtures.js` auto-use 픽스처 — 모든 스펙에서 Supabase POST/PATCH/DELETE 기본 차단. 30개 스펙 import 교체. DB 카운트 전후 실증(example 3 / hidden 62 / published 9) |
| daily_contents 폴백 테스트 | 오늘 날짜 없으면 최신 날짜 콘텐츠 표시 검증. 코드는 `fd43ff9`에 이미 구현, 테스트만 추가 |

### 7/5~7/6 이전 세션 배경 (다음 세션에서 참고)

| 항목 | 요약 |
|------|------|
| 프랜차이즈 완결 | 공정위 11,683개 브랜드 시드 데이터 연결. A3 창업준비 → 프랜차이즈 선택 흐름 완성 |
| daily_contents 배치 | Supabase `daily_contents` 테이블. 배치로 콘텐츠 업로드. **프롬프트 금지 규칙**: 수치 없음·앱 언급 없음·액션 먼저. 실검수(코칭·필독 문구 직접 검토) |
| 고객 시뮬레이션(7/6 오전) | `docs/SIM-BRIEF-20260706.md` 참조. 양도자 신규 진입 시나리오 |

---

## 현재 DB 상태

| status | count |
|--------|-------|
| example | 3 |
| hidden | 62 |
| published | 9 |

published 9건 중 실운용: 룩스필라테스(코워크) 포함. 대표님 매물 별도 확인 필요.

---

## 결정 대기 (대표님 → Claude 순서)

| 항목 | 내용 |
|------|------|
| **네이버 API 등록** | 동종 시장 동향을 네이버 뉴스 API로 채울지 — 대표님 API 등록 후 연결 가능 |
| **D4 설계 세션** | 연락처 교환 상대방 수락 흐름 실구현. B2B 매칭 성사 UI 실연결. 별도 설계 세션 필요 |
| **배치 자동화** | daily_contents 매일 자동 업로드 — GitHub Actions or Supabase Edge Function. 지금은 수동 |
| **AI 없이 등록된 매물 완성도 처리** | `ai_draft=null` 매물의 완성도 점수 산정 방침 미결. E1/2 "AI 없이 계속" 경로로 생성됨 |

---

## 교훈 (다음 세션도 유효)

1. **지워도 다시 생기면 생성 경로를 막아라** — DB 잔재 31건 삭제 후 3건 재생성. 테스트 mock이 근본 해법, 삭제는 임시방편
2. **완료 주장은 SQL 카운트 실증으로** — "격리됐다"는 코드 주장만으론 부족. 테스트 전후 `SELECT count(*) GROUP BY status`로 실증
3. **신규 사용자 검증은 Playwright 신규 컨텍스트로** — localStorage 있는 브라우저는 기존 사용자. 진짜 신규 기기 버그는 깨끗한 컨텍스트에서만 재현

---

## 다음 작업 후보 (우선순위 순)

1. 대표님 결정 대기 항목 중 하나 선택 후 진행
2. D4 연락처 교환 상대방 수락 흐름 (현재 더미 버튼 — 가장 큰 미구현 구멍)
3. daily_contents 배치 자동화
4. 카카오 OAuth 마무리 (KOE205 — 비즈앱 전환 or email scope 제거)

---

## 테스트 현황

- **144 passed, 0 failed** (2026-07-06 기준)
- `tests/fixtures.js` — 전역 Supabase 쓰기 차단. 새 스펙은 반드시 이 파일 임포트
- `tests/helpers.js` — `mockGemini`, `mockMarketData`, `mockDailyContents` 공통 헬퍼
- DB 격리 원칙: 쓰기 테스트는 `page.route(SUPABASE_*)`로 mock 필수, 실 DB 0건 추가

---

## 커밋 체인 (이번 세션)

```
ace8e8d  test: daily_contents fallback — today empty → latest date content
1fa20f8  test: global Supabase write guard via shared fixtures.js
5e88625  test: isolate Supabase INSERT in seller/listing.spec.js
6247c1f  chore: backup record of 2 deleted published listings
9c4603c  test: verify myListing query includes device_id + status filters
34960ab  chore: backup record of 31 deleted example listings
593b73d  fix: exclude example/completed listings from myListing (explore filter)
037c138  fix: explorer filter chips visually disabled when no listing
68f63d9  fix: custom facility chips visible + explore filter chips properly disabled
```
