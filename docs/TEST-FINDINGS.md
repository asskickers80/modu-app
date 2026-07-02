# TEST-FINDINGS.md

> **규칙**: 이 파일은 Append-only. 절대 덮어쓰지 말 것.
> 각 섹션: 날짜/시간 헤더 + 당시 작업 내용
> 🔴 Broken | 🟡 Fragile | 🔵 Improve | ⚪ Later
> 항목 형식: `[화면/단계] 설명 — 재현 방법`

---

## 2026-07-02 — 정찰 단계: 양도자 전체 클릭 경로 코드 추적

### 작업: Playwright 테스트 준비를 위한 실제 코드 기반 정찰

---

### 1. STATUS.md 요약 — 현재 구현 상태 (seller 관점)

| 항목 | 상태 |
|------|------|
| A1 스플래시 | ✅ 구현됨 (2초 자동 이동) |
| A2 카테고리 선택 | ✅ 구현됨 |
| A3 양도자 질문 | ✅ 구현됨 (3개 질문 칩 방식) |
| A4 가입 방식 | ⚠️ 카카오만 실제 OAuth, 나머지 3개(네이버·Apple·휴대폰)는 더미 |
| 카카오 OAuth | ❌ KOE205 차단 (Supabase GoTrue가 account_email 하드코딩, 비즈앱 필요) |
| 이메일 Magic Link | ✅ 실제 동작 (Supabase OTP) |
| AuthCallbackPage | ✅ 구현됨 (profiles 테이블 신규/기존 분기) |
| A7 양도자 대시보드 | ✅ 구현됨 (Gemini 코칭 포함, 더미 데이터) |
| E1 1단계 (기본 정보) | ✅ 구현됨 (Daum 주소검색, 예시✦ 자동채움) |
| E1 2단계 (AI 초안) | ✅ 구현됨 (Gemini generateListingDraft + fetchMarketData + generateMarketInsight) |
| E1 3단계 (검수) | ✅ 구현됨 (블록별 그대로/수정/공개안함) |
| E1 4단계 (사진·증빙) | ✅ 구현됨 (Supabase Storage 업로드) |
| E1 5단계 (공개) | ⚠️ 구현됨 (Supabase listings 저장), 단 본인인증은 "더미" |

---

### 2. 양도자 전체 클릭 경로 — 실제 코드 기준

| # | 화면 | 라우트 | 컴포넌트 | 버튼 / 액션 | 다음 라우트 | 비고 |
|---|------|--------|----------|------------|------------|------|
| 1 | 스플래시 | `/` | A1Splash.jsx | 없음 (자동 2초) | `/a2` | `setTimeout(() => navigate('/a2'), 2000)` |
| 2 | 카테고리 선택 | `/a2` | A2CategorySelect.jsx | "이제 그만할 때가 됐나봐요" 칩 탭 → "다음" | `/a3/seller` | state: `{ category: 'seller' }` 전달 |
| 3 | 양도자 질문 3개 | `/a3/seller` | A3SellerQuestions.jsx | Q1 업종 칩 + Q2 지역 칩 + Q3 양도방식 칩 → "다음" | `/a4` | state: `{ category, bizType, region, transfer }` |
| 4 | 가입 방식 | `/a4` | A4SignUp.jsx | 카카오·네이버·Apple·휴대폰·이메일 | 카카오→OAuth, 나머지→더미 | `localStorage.setItem('modu_pending_category', category)` |
| 4a | OAuth 콜백 | `/auth/callback` | AuthCallbackPage.jsx | 자동 처리 | `/a7/seller` (신규) or 대시보드 (기존) | profiles 테이블 조회 → 신규면 insert |
| 5 | 양도자 대시보드 | `/a7/seller` | A7SellerDashboard.jsx | "매물 등록·수정하기" 버튼 | `/e1/1` | Gemini `generateSellerCoaching` 자동 호출 (캐시 1일) |
| 6 | E1 1단계 기본정보 | `/e1/1` | e1/E1Step1.jsx | 주소검색 → 상호·보증금·월세·권리금·양도방식 입력 → "다음 — AI 초안 생성" | `/e1/2` | `canNext`: address, shopName, deposit, monthlyRent, transferFee, transferType 모두 필요 |
| 7 | E1 2단계 AI생성 | `/e1/2` | e1/E1Step2.jsx | 자동 생성 (버튼 없음) → 완료 후 "다음" | `/e1/3` | Gemini `generateListingDraft` + `fetchMarketData` + `generateMarketInsight` 병렬 실행 |
| 8 | E1 3단계 검수 | `/e1/3` | e1/E1Step3.jsx | 블록별 "그대로/수정/공개 안 함" 선택 → "다음" | `/e1/4` | `allReviewed`: 전 블록 선택 완료 시 활성 |
| 9 | E1 4단계 사진·증빙 | `/e1/4` | e1/E1Step4.jsx | 사진 업로드(Supabase Storage) + 시설·증빙 선택 → "다음" | `/e1/5` | 사진 미첨부도 진행 가능 |
| 10 | E1 5단계 공개 | `/e1/5` | e1/E1Step5.jsx | "공개하기" → 본인인증 모달 → "휴대폰 본인인증 (더미)" | `/a7/seller` | Supabase `listings` insert → 성공 시 대시보드 복귀 |

---

### 3. 테스트 시나리오 후보

| ID | 시나리오 | 유형 |
|----|----------|------|
| T01 | 양도자 온보딩 해피패스 (A1→A2→A3→A4 이메일→A7→E1/1~5 예시✦ 사용) | 핵심 |
| T02 | A2 카테고리 미선택 상태에서 "다음" 비활성 확인 | 가드 |
| T03 | A3 Q1/Q2/Q3 중 하나 미답변 시 "다음" 비활성 확인 | 가드 |
| T04 | E1/1 필수 필드(보증금·월세 등) 빈칸 시 "다음" 비활성 | 가드 |
| T05 | E1/2 Gemini AI 오류 시 에러 화면 + "다시 시도" / "4단계로 건너뛰기" | 에러 처리 |
| T06 | E1/3 aiDraft 없이 직접 `/e1/3` 접근 시 "AI 초안이 없어요" 가드 화면 | 에러 처리 |
| T07 | E1/5 Supabase listings 저장 실패 시 모달 에러 상태 | 에러 처리 |
| T08 | 카카오 로그인 시도 → KOE205 에러 화면 재현 | 알려진 버그 |
| T09 | 이메일 Magic Link → 새 탭에서 콜백 → A7 대시보드 정상 도달 | 핵심 |
| T10 | A7 대시보드 "매물 수정하기" (더보기 메뉴) → E1/1 재진입 | 흐름 |

---

### 4. 발견 사항

#### 🔴 Broken — 현재 실제로 동작하지 않음

- **[A4] 네이버·Apple·휴대폰 로그인**: 세 버튼 모두 `goNext()` 더미 함수 호출
  → 실제 인증 없이 localStorage 프로필로만 처리됨
  → 재현: A4에서 "네이버로 시작하기" 탭 → 바로 대시보드 진입

- **[A4/카카오] KOE205 차단**: `supabase.auth.signInWithOAuth({ provider: 'kakao' })` 시도 시
  → Supabase GoTrue 서버가 `account_email` scope를 하드코딩으로 추가
  → 카카오 비즈앱 미등록 계정에서 동의 불가
  → 재현: A4에서 "카카오로 시작하기" → 카카오 인증 후 동의 단계에서 KOE205

- **[E1/5] 본인인증 더미**: "휴대폰 본인인증 (더미)" 버튼이 실제 인증 없이 통과
  → `handleAuth()` → `saveListing()` → 바로 공개
  → 재현: E1/5 공개하기 → 모달 → 더미 버튼 탭

#### 🟡 Fragile — 조건에 따라 깨질 수 있음

- **[E1/2] AI 생성 무한 로딩**: Gemini API 무응답(네트워크 hang) 시 catch 미도달
  → 에러 catch는 있으나 fetch 자체가 hang되면 영원히 로딩 중
  → 재현: Gemini endpoint를 차단하거나 네트워크 속도 제한

- **[A4→콜백] localStorage 타이밍**: 이메일 Magic Link 클릭이 새 탭에서 열리지 않으면
  `modu_pending_category`가 이미 삭제된 상태일 수 있음
  → 재현: 같은 탭에서 링크 열기 (일부 이메일 클라이언트)

- **[AuthCallback] 15초 타임아웃**: 느린 네트워크에서 "로그인 처리 시간이 초과됐어요" 노출
  → 재현: 네트워크 스로틀링 후 이메일 링크 클릭

- **[A7] Gemini 코칭 캐시 미스**: `localStorage 'modu_seller_coaching'` 없거나 날짜 다르면 매 진입 시 Gemini 호출
  → API 할당량 소진 시 COACHING_FALLBACK 텍스트로 대체 (사용자 혼동 가능)

- **[개발 서버 포트]**: 5173이 사용 중이면 Vite가 5174로 전환
  → Playwright `baseURL`이 5173으로 고정돼 있으면 테스트 전체 실패
  → 해결 필요: `vite.config.js`에 `server: { port: 5173, strictPort: true }` 추가

#### 🔵 Improve — 동작하지만 개선 여지

- **[E1/1] "예시✦" 데모 버튼**: 실제 운영에서는 제거하거나 dev-only 처리 필요
  → Playwright 해피패스 테스트에서는 유용하게 활용 가능

- **[E1/4] 사진 없이도 공개 가능**: 사진 미첨부 상태로 E1/5 진행 허용
  → 완성도 낮은 매물이 즉시 공개될 수 있음

- **[E1/3] 블록 전체 검수 전 "다음" 잠김**: `allReviewed` 조건이 `blocks.length > 0`에 의존
  → blocks 로드 전에 "다음" 활성화될 수 있는지 확인 필요

- **[A7→대시보드] AI 코칭 null 로딩 상태**: `coaching === null`일 때 UI가 빈칸
  → 스켈레톤 로딩 처리 없음

#### ⚪ Later — 지금은 아니지만 기록

- **[A1] 스플래시 2초**: 저속 기기나 접근성 도구에서 자동 이동이 너무 빠를 수 있음

- **[전체] Supabase RLS**: 현재 dev_allow_all 정책
  → 실제 출시 전 로그인 기반(auth.uid()) RLS로 교체 필수

- **[listings] device_id 기반 소유권**: listings/conversations가 device_id(UUID in localStorage)로 저장됨
  → 로그인 후 auth.uid()로 migration 필요

- **[E1/2→E1/3] buildListingBlocks 재계산**: E1Step3에서 `data.address` 의존 메모이제이션
  → 주소 변경 시 블록 재생성 여부 검증 필요

- **[멀티프로파일] sessionStorage 기반**: `modu_multiprofile_pending` → 새 탭에서 유실될 수 있음

---

*다음 작업: Playwright 테스트 코드 작성 단계 (playwright.config.js + tests/ 기본 구조)*

---

## 2026-07-02 — 진단: 실거래가 공공데이터 API 호출 오류

### 작업: 500 에러 원인 코드 추적 (코드 수정 없음, 진단만)

---

#### ✅ 해결됨 — 실거래가 API 서비스명·오퍼레이션·포맷 불일치 → 수정 완료 (2026-07-02)

**해결**: `RTMSDataSvcSBInfo` → `RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade` 로 서비스명·오퍼레이션 수정, `_type=json` 제거 후 XML 응답으로 전환, `DOMParser` 파싱 도입, resultCode 비교를 `'000'`(세 자리)으로 수정, 필드 매핑을 `dealAmount` / `buildingAr` / `dealYear` / `dealMonth` 로 교체.

**위치**: `src/lib/marketData.js:101` (수정 전 기준)

현재 코드:
```
/api/opendata/1613000/RTMSDataSvcSBInfo?serviceKey=...&_type=json
```
실제 전달 URL:
```
https://apis.data.go.kr/1613000/RTMSDataSvcSBInfo?serviceKey=...&_type=json
```

공공데이터포털 공식 값과 비교:

| 항목 | 공식 (포털 기준) | 현재 코드 | 일치 |
|------|----------------|-----------|------|
| 서비스명(EndPoint) | `RTMSDataSvcNrgTrade` | `RTMSDataSvcSBInfo` | ❌ |
| 오퍼레이션명 | `getRTMSDataSvcNrgTrade` | (오퍼레이션 없음) | ❌ |
| 데이터포맷 | XML | `_type=json` | ❌ |
| 도메인 (`apis.data.go.kr`) | ✅ | ✅ | ✅ |
| 기관코드 (`1613000`) | ✅ | ✅ | ✅ |

- **vite.config.js 프록시 자체는 정상**: `/api/opendata` → `https://apis.data.go.kr`, rewrite 올바름
- 파싱 코드(`r.json()`, `it['거래금액']` 한글 JSON 키)도 XML 응답 기준으로 전면 수정 필요
- 재현: Gemini API 키 + 공공데이터 키 모두 `.env`에 설정 후 E1/2 진입 → 콘솔에 500 에러 확인

**수정 방향 (미적용)**:
1. `RTMSDataSvcSBInfo` → `RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade`
2. `_type=json` 제거 (XML 응답)
3. `r.json()` → `DOMParser`로 XML 파싱으로 교체
4. 응답 필드명 재확인 후 `parseItems()` 수정

---

## 2026-07-02 — 양도자 변형 테스트 - 핵심3

### 작업: tests/seller-edge.spec.js 실행 결과 (3개 시나리오)

실행 명령: `npx playwright test tests/seller-edge.spec.js --reporter=list`  
결과: **2 passed, 1 failed** (총 12.5초)

| # | 시나리오 | 결과 | 관찰된 실제 동작 |
|---|----------|------|----------------|
| 1 | E1/1 빈 입력 → 다음 버튼 | ✅ PASS | `disabled` 상태 유지, force 클릭 후에도 `/e1/1` 에서 이동 없음 |
| 2 | E1/2 중간 새로고침 | ✅ PASS | URL `/e1/2` 유지, 앱 생존, Gemini mock으로 "다음" 버튼 재출현 — 단, 이전 입력값 전부 소실 |
| 3 | E1/5 제출 버튼 이중 클릭 | 🔴 FAIL | Supabase listings insert **2회 호출됨** — 중복 저장 버그 확인 |

---

#### ✅ 해결됨 — 이중 제출 버그 수정 (2026-07-02)

- **[E1/5] 본인인증 버튼 이중 제출**: `handleAuth()` 내부에서 `setStep('verifying')`을 호출해 버튼을 교체하지만, React DOM 업데이트 전에 두 번째 클릭 이벤트가 같은 JS 틱 안에서 발송되면 `saveListing()` → Supabase insert가 2회 실행됨  
  → 재현: E1/5 → "매물 공개하기" → `authBtn.click(); authBtn.click()` 동시 발송 → Supabase POST 2회 로그 확인  
  → **수정 내용** (`src/screens/e1/E1Step5.jsx`):  
    1. `useRef isSubmitting` — `handleAuth` 진입 시 `true` 설정, 이후 호출은 즉시 return  
    2. `useState submitting` — 버튼 `disabled={submitting}` + 색상 회색 전환, 에러 시 false로 리셋  
  → Playwright 시나리오3 재실행 결과: insert **1회** 확인, **PASS**

#### 🟡 Fragile — 조건에 따라 깨질 수 있음

- **[E1 전체] 새로고침 시 입력값 전부 소실**: `E1Context`가 순수 `useState`(인메모리)로만 구성됨 — `page.reload()` 또는 브라우저 새로고침 시 `address`, `shopName`, 모든 E1 데이터가 초기화됨  
  → 재현: E1/1에서 입력 후 E1/2 이동 → 브라우저 새로고침 → E1/2가 빈 컨텍스트로 AI 생성 재시도  
  → 앱은 죽지 않고(흰화면 없음) "다음" 버튼도 나타나지만, 1단계 데이터 없이 허위 초안 생성  
  → **위치**: `src/screens/e1/E1Context.jsx` — `sessionStorage` 또는 `useReducer`+persist 적용 검토

#### 🔵 Improve — 동작하지만 개선 여지

- **[E1/1] 빈 입력 가드**: `disabled` 처리는 정상 동작. 다만 사용자가 어떤 필드가 빠졌는지 알 수 없음  
  → 버튼 아래에 "주소와 보증금·월세를 먼저 입력해 주세요" 같은 힌트 텍스트 추가 검토

---

## 2026-07-02 — 양도자 변형 테스트 - 나머지4

### 작업: tests/seller-edge.spec.js 시나리오4~7 추가 실행 결과

실행 명령: `npx playwright test tests/seller-edge.spec.js --reporter=list`  
결과: **7 passed, 0 failed** (총 50.2초 / 기존 1~3 포함)

| # | 시나리오 | 결과 | 관찰된 실제 동작 |
|---|----------|------|----------------|
| 4 | E1/3 → 브라우저 뒤로가기 | ✅ PASS | `/e1/2`로 정상 복귀, 앱 생존(텍스트 783자), E1Context 인메모리 유지 |
| 5 | E1/4 사진 건너뛰기 → 제출 | ✅ PASS | 사진 없이 저장 성공 (insert 1회) — E1/4 다음 버튼 조건 없음 |
| 6 | aiDraft 없이 /e1/3 직접 진입 | ✅ PASS | "AI 초안이 없어요" 가드 + "1단계로 이동" 버튼 정상 노출 |
| 7 | /e1/3·/e1/5 직접 URL 접근 | ✅ PASS | /e1/3 → 가드 화면, /e1/5 → 완성도 화면 렌더(가드 없음, 흰화면 아님) |

---

#### 🟡 Fragile — 조건에 따라 깨질 수 있음

- ~~**[E1/5] 직접 URL 진입 시 빈 데이터로 매물 공개 가능**~~ → **✅ 해결됨 (2026-07-02)**  
  가드 없음 문제 수정 완료 — 아래 "해결됨" 섹션 참조

#### 🔵 Improve — 동작하지만 개선 여지

- **[E1/4] 사진 없이 공개 가능**: "다음 — 완성도 확인" 버튼이 사진 첨부 여부와 무관하게 항상 활성화됨. 사진 미첨부 상태로 매물이 즉시 공개됨  
  → 재현: E1/4에서 사진 업로드 없이 "다음" 클릭 → E1/5 진입 → 저장 성공 (insert 1회 확인)  
  → 경고 문구나 soft 권고("사진 없이 계속?") 정도면 충분, 하드 차단은 과함

- **[E1/3 뒤로가기] AI 재생성 발생**: E1/3에서 브라우저 뒤로가기 시 /e1/2로 복귀 → `E1Step2` 재마운트 → `useEffect(() => { run() }, [])` 재실행 → Gemini API 재호출 발생  
  → 재현: E1/3 진입 후 page.goBack() → 네트워크 탭에서 Gemini 요청 확인  
  → `data.aiDraft`가 이미 있으면 재생성 스킵하는 조건 추가 검토

---

## 2026-07-02 — /e1/5 진입 가드 추가 및 시나리오7 강화

### 작업: E1Step5 가드 미적용 🟡 Fragile → 수정 완료

#### ✅ 해결됨 — /e1/5 직접 URL 진입 시 빈 매물 저장 가능 (2026-07-02)

이전 섹션에서 🟡 Fragile로 기록된 항목 수정 완료.

- **수정 내용** (`src/screens/e1/E1Step5.jsx`):
  - `!data.aiDraft` 조건으로 가드 추가 (E1Step3와 동일 패턴)
  - 가드 문구: "아직 매물 작성이 완료되지 않았어요" + "처음부터 시작" 버튼 (→ `/e1/1`)
  - E1Step3의 "AI 초안이 없어요"와 달리 최종 제출 단계 맥락에 맞는 별도 문구 사용
  - 가드 발동 시 "매물 공개하기" 버튼·완성도 게이지 전혀 렌더되지 않음

- **테스트 강화** (`tests/seller-edge.spec.js` 시나리오7):
  - `/e1/5` 직접 접근 → "매물 공개하기" 버튼 미노출 (`not.toBeVisible()`) 단언
  - "아직 매물 작성이 완료되지 않았어요" 텍스트 노출 (`toBeVisible()`) 단언
  - "처음부터 시작" 버튼 노출 (`toBeVisible()`) 단언
  - 기존 body 길이만 보던 방식에서 명시적 3개 단언으로 교체

- **실행 결과**: `7 passed (21.1s)` — 시나리오 1~7 전체 통과
- **커밋**: `139b817` `fix: add proper entry guard + message for /e1/5, strengthen scenario7 test`
