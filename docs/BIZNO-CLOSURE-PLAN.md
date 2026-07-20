# 사업자번호 등록 + 폐업 자동 감지 — 설계·착수 계획 (SQL 지점 정지)

오더: `docs/ORDER-bizno-closure-check.md` / 스키마: `scripts/sql/20260721-bizno-closure.sql`

조사 완료. 스키마 SQL 제시 후 멈춤. 아래는 SQL 실행 후 이어갈 구현 계획과, **착수 전 대표님 결정이 필요한 3건**이다.

---

## 실측 현황 (2026-07-21)
- listings에 `business_number`·`closure_*` 컬럼 **없음** (실 DB 확인).
- 배치 대상(status = published·negotiating) **10건**, 전부 사업자번호 없음.
- 국세청 상태조회 API를 호출하는 코드 **0건** (기존 사업자 인증 UI는 전부 더미).
- 크론은 `api/collect-market-news.js` 1개뿐, **매일** 20:00 UTC (주 1회 아님). `vercel.json`.

## 국세청 API — 실체 확인
오더가 말하는 "국세청 API"는 공공데이터포털(data.go.kr)의 **국세청 사업자등록정보 진위확인 및 상태조회 서비스**다 (odcloud.kr).
- 진위확인: `POST https://api.odcloud.kr/api/nts-businessman/v1/validate?serviceKey=…` — 번호+대표자명+개업일로 등록 진위 확인. E1 공개 게이트용.
- 상태조회: `POST https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=…` body `{"b_no":["1234567890", …]}` — `b_stt_cd` 반환(`01` 계속·`02` 휴업·`03` 폐업). **한 번에 최대 100건** → 우리 10건은 **1회 호출**로 끝. 무료.
- 즉 요건 4(호출량)는 결론: **배치 묶음 설계 불필요, 단순 순회/일괄 1콜.**

---

## ⚠️ 착수 전 대표님 결정 3건

**① 국세청 API 활용신청 (블로커)**
이 API는 공공데이터포털에서 **별도 활용신청**이 필요하다(실거래가 키와 같은 계정, 다른 신청). 신청·승인 전에는 진위확인도 상태조회도 실패한다.
- 필요한 것: data.go.kr에서 "국세청_사업자등록정보 진위확인 및 상태조회 서비스" 활용신청 → 승인된 키.
- 서버 함수(api/)에서 쓰므로 브라우저 노출 없는 env가 필요. `.env.example`에 `PUBLIC_DATA_KEY`(VITE_ 접두사 없음) 추가 예정. 기존 `VITE_PUBLIC_DATA_KEY`(실거래가·브라우저용)와 **별개**로 둘지, 같은 키를 서버용으로도 넣을지 결정 필요.
→ **대표님이 활용신청 후 키를 알려주셔야** 진위확인·배치가 실제로 동작한다. 그 전까지는 코드가 있어도 더미 통과로만 검증된다(테스트는 mock).

**② 진위확인 게이트를 얼마나 강하게 걸까**
오더는 "진위확인 통과 시에만 공개 가능"이라 했다. 그런데 국세청 API가 장애면 정상 사업자도 공개를 못 하게 된다(뉴스·Gemini는 장애 시 폴백 허용이 원칙).
- (a) **엄격** — 진위확인 성공해야만 공개. API 장애 시 공개 차단.
- (b) **완화(권장)** — 번호 형식(10자리)은 필수, 진위확인은 시도하되 API 장애 시엔 "미검증" 표식만 남기고 공개는 허용. 폐업 배치가 사후에 잡는다.
→ 권장은 (b). E1 완주 가능성(헌법: Gemini 장애 시에도 등록 완주)과 일관된다.

**③ RLS와 배치 권한**
폐업 배치는 서버에서 anon 키로 남의 매물 status를 내린다. 현재 RLS가 "울타리 수준(DELETE만 차단)"이라 **지금은 동작**하지만, 이는 아무나 남의 매물 status를 바꿀 수 있다는 뜻이다.
- (a) 현행 유지 — anon 배치로 진행 (정식 RLS 도입 시 서비스 롤로 교체).
- (b) 지금 서비스 롤 키 도입 — 코드베이스에 서비스 롤 키가 없어 새로 넣어야 함.
→ 정식 RLS가 아직 "로그인 데이터 귀속 완료 후" 과제이므로 **(a) 현행 유지** 권장. 단 PROGRESS.md 보안 부채에 명시.

---

## SQL 실행 후 구현 순서 (승인 후)

1. **사업자번호 검증 lib** (`src/lib/bizno.js`) — 10자리 형식 검증 + 국세청 진위확인 래퍼(장애 폴백). 순수 로직은 지금도 가능.
2. **E1 사업자번호 입력** — E1Step1 업종 근처에 필드 추가(INITIAL_DATA·listingToContext에 `businessNumber`). 공개 직전(E1Step5 AuthGateModal `handleAuth`)에서 진위확인 → 통과 시 `business_number`·`bizno_verified_at` 저장. 기존 매물은 수정 진입 시 요청, 소급 강제·비공개 강등 없음.
3. **폐업 배치** (`api/check-business-closure.js`) — 뉴스 크론과 같은 골격. published·negotiating 중 business_number 있는 건을 모아 상태조회 1콜 → `b_stt_cd='03'`이면 status='hidden' + closure_detected_at/closure_prev_status 기록. `vercel.json` crons에 주 1회(`0 20 * * 1`) 추가.
4. **홈 확인 카드** — IndustrySubPrompt 패턴 복제. 타겟 `closure_detected_at IS NOT NULL AND closure_resolved_at IS NULL AND status='hidden'`. 3택(완료/시설·집기 계속/내리기) → 각각 completed·published(양도방식 표기 갱신)·hidden 유지 + closure_resolved_at 기록. 무응답 시 hidden 유지.
5. 방문자 노출 쿼리에서 business_number 미노출 확인 (ExplorePage `select('*')`가 딸려오지 않도록 컬럼 명시 검토).

각 단계 Playwright: 진위 게이트 / 폐업 mock→hidden / 확인 카드 3택.
