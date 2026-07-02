# 모두(Modu) — 개발 현황 STATUS.md

> 최종 업데이트: 2026-07-02  
> 빌드: ✅ 0 에러 (bundle 859KB gzip 203KB)  
> 테스트: Playwright 29개 (onboarding 5 / listing 9 / guards 8 / seller-edge 7) — 전체 PASS

---

## 오늘 완료 (2026-07-02)

| 항목 | 파일 | 내용 |
|------|------|------|
| 실거래가 API 500 해결 | `src/lib/marketData.js` | 서비스명 `RTMSDataSvcNrgTrade` + 오퍼레이션 `getRTMSDataSvcNrgTrade` 교체, `_type=json` 제거, XML DOMParser 파싱 도입, resultCode `'000'` 비교, 필드명 `dealAmount` / `buildingAr` / `dealYear` / `dealMonth` 교체 → 실데이터 수신 확인 |
| E1Step5 중복 제출 방어 | `src/screens/e1/E1Step5.jsx` | `useRef` in-flight 플래그(`isSubmitting`) + `useState`(`submitting`) 버튼 `disabled` 추가 — 동기 이중 클릭 시 insert 2→1회로 감소 (Playwright 시나리오3 검증) |
| 양도자 변형 테스트 7개 | `tests/seller-edge.spec.js` | 빈 입력·새로고침·중복 제출·뒤로가기·사진없이 제출·AI초안 가드·직접 URL 접근 — 7 passed, 크래시 0건 |

---

## 라우트 & 화면 완성도

| 경로 | 화면 | 상태 | 비고 |
|------|------|------|------|
| `/` | A1 스플래시 | ✅ 완성 | 브랜드 색 #0E6589, ModuMark, 2초 후 /a2 |
| `/a2` | A2 카테고리 선택 | ✅ 완성 | 6개 카테고리, 멀티프로필 지원 |
| `/a3/seller` | A3 양도자 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a3/landlord` | A3 임대인 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a3/startup` | A3 창업준비 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a3/operating` | A3 운영중 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a3/business` | A3 기업회원 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a4` | A4 가입 방식 | ✅ 완성 | 카카오/네이버/Apple/휴대폰, 멀티프로필 분기 |
| `/a7/seller` | 양도자 대시보드 | ✅ 완성 | AI 코칭+8슬롯, 일일 캐시 |
| `/a7/landlord` | 임대인 대시보드 | ✅ 완성 | AI 코칭+임대시세, 일일 캐시 |
| `/a7/startup` | 창업준비 피드 | ✅ 완성 | AI 인사이트+창업진단, 일일 캐시 |
| `/a7/operating` | 운영중 대시보드 | ✅ 완성 | AI 코칭+운영진단, 일일 캐시 |
| `/a7/business` | 기업회원 대시보드 | ✅ 완성 | AI 코칭+7슬롯, Push영업 |
| `/a7/browsing` | 그냥구경 피드 | ✅ 완성 | AI 트렌드, 비회원 가입 유도 |
| `/e2/:id` | 매물 상세 (양수자뷰) | ✅ 완성 | t1/t2/t3 샘플 |
| `/e2l/:id` | 상가 상세 (임차뷰) | ✅ 완성 | v1/v2/v3 샘플 |
| `/e1/1~5` | 양도자 매물 등록 5단계 | ✅ 완성 | AI 초안 Gemini 실연결 |
| `/e1p/1~5` | 임대인 상가 등록 5단계 | ✅ 완성 | AI 초안 Gemini 실연결 |
| `/e1b/1~5` | 기업회원 노출페이지 5단계 | ✅ 완성 | AI 트리거 Gemini 실연결 |
| `/e3/:mode` | 시세 조회 | ✅ 완성 | seller/landlord 모드 |
| `/d4/inbox` | 양도자 메시지함 | ✅ 완성 | DM 우선, 연락처 교환 모달 |
| `/d4/chat/:id` | 양도자 1:1 대화 | ✅ 완성 | 연락처 교환 양측 동시 공개 |
| `/d4/landlord/inbox` | 임대인 메시지함 | ✅ 완성 | |
| `/d4/landlord/chat/:id` | 임대인 1:1 대화 | ✅ 완성 | |
| `/d4/startup/inbox` | 창업준비 문의함 | ✅ 완성 | |
| `/d4/startup/chat/:id` | 창업준비 1:1 대화 | ✅ 완성 | |
| `/d4/operating/inbox` | 운영중 업체문의함 | ✅ 완성 | |
| `/d4/operating/chat/:id` | 운영중 1:1 대화 | ✅ 완성 | |
| `/d4/business/inbox` | 기업회원 문의함 | ✅ 완성 | |
| `/d4/business/chat/:id` | 기업회원 1:1 대화 | ✅ 완성 | 매칭 성사 B2B 표현 |
| `/explore` | 탐색 (매물 목록) | ✅ 완성 | 검색+필터+정렬 실동작 |
| `/community` | 커뮤니티 | ✅ 완성 | 추천/오픈채팅/Q&A 3탭, AI 인사이트 |
| `/community/room/:id` | 커뮤니티 채팅방 | ✅ 완성 | |
| `/community/post/:id` | 커뮤니티 포스트 | ✅ 완성 | |
| `/my` | 마이 페이지 | ✅ 완성 | ⓪~⑦ 8블록, ProfileSwitchSheet |
| `/my/:section` | 마이 상세 (16섹션) | ✅ 완성 | membership~lab 전부 |
| `/my/proposal-settings` | 제안받기 설정 | ✅ 완성 | 12개 분류 토글 |
| `/seller/market` | 시장 동향 | ✅ 완성 | |
| `/seller/companies` | 업체 목록 | ✅ 완성 | |
| `/seller/company/:id` | 업체 상세 | ✅ 완성 | |
| `/seller/articles` | 아티클 목록 | ✅ 완성 | |
| `/seller/article/:id` | 아티클 상세 | ✅ 완성 | |
| `/business/performance` | 기업 노출 성과 | ✅ 완성 | AI 해석 Gemini 실연결 |
| `/business/push` | Push 영업 | ✅ 완성 | 이중 게이트 |
| `/business/competitor` | 동종 비교 | ✅ 완성 | |
| `/business/trend` | 업계 동향 | ✅ 완성 | |
| `/operating/sales-input` | 매출 입력 | ✅ 완성 | |
| `/auth-gate` | 인증 게이트 | ✅ 완성 | 3가지 트리거 |
| `/dev` | DevMenu | ✅ 완성 | 전체 화면 링크 |
| `/dev/brand` | 브랜드 미리보기 | ✅ 완성 | |
| `/dev/review-log` | 검수 로그 | ✅ 완성 | |
| `/dev/supabase` | Supabase 연결 테스트 | ✅ 완성 | 3단계 진단, 키 정보 표시 |

**총 라우트: 49개 / 에러: 0개**

---

## AI 기능 현황 (Gemini 실연결)

| 함수 | 용도 | 캐시 | 폴백 | 사용 화면 |
|------|------|------|------|----------|
| `generateSellerCoaching` | 양도자 코칭 | 일일 ✅ | 정적 문구 ✅ | A7SellerDashboard |
| `generateMarketInsight` | E1 시세분석 | 요청시 | - | E1Step2 |
| `generateListingDraft` | E1 매물초안 | 요청시 | - | E1Step2 |
| `generateLandlordCoaching` | 임대인 코칭 | 일일 ✅ | 에러 메시지 ✅ | A7LandlordDashboard |
| `generateLandlordListingDraft` | E1p 상가초안 | 요청시 | - | E1pStep2 |
| `generateRentalInsight` | 임대시세 해석 | 일일 ✅ | - | A7LandlordDashboard |
| `generateStartupInsight` | 창업 인사이트 | 일일 ✅ | - | A7StartupFeed |
| `generateStartupDiagnosis` | 창업 진단 | 일일 ✅ | - | A7StartupFeed |
| `generateOperatingCoaching` | 운영 코칭 | 일일 ✅ | - | A7OperatingDashboard |
| `generateOperatingDiagnosis` | 운영 진단 | 일일 ✅ | - | A7OperatingDashboard |
| `generateBusinessCoaching` | 기업회원 코칭 | 일일 ✅ | - | A7BusinessDashboard |
| `generateBusinessPerformanceInsight` | 성과 해석 | 요청시 | - | BusinessPerformancePage |
| `generateBusinessTriggers` | E1b 트리거 | 요청시 | - | E1bStep2 |
| `generateBrowsingCopy` | 트렌드 문구 | 일일 ✅ | null 처리 ✅ | A7BrowsingFeed |
| `generateCommunityInsight` | 커뮤니티 인사이트 | 일일 ✅ | 정적 문구 ✅ | CommunityPage |

**AI 함수: 15개 / 전부 Gemini API 실연결 / 정적 텍스트 페이크 없음**

---

## 핵심 원칙 준수 현황

| 원칙 | 상태 | 비고 |
|------|------|------|
| DM 우선 (전화번호 비공개) | ✅ | 모든 D4 채팅 헤더에 안내 문구 |
| 연락처 교환 = 요청→수락 (양측 동시) | ✅ | ExchangeConfirmModal 전 D4Chat 구현 |
| B2C 매칭 성사 선언 없음 | ✅ | D4Chat: "연락처 교환 완료" |
| B2B 매칭 성사 표현 | ✅ | D4BusinessChat: "매칭 성사" |
| 타이핑 최소화 (칩/버튼 우선) | ✅ | A2/A3 전부 칩 선택 |
| 멀티프로필 지원 | ✅ | sessionStorage relay 패턴 |
| 브랜드 색 #0E6589 적용 | ✅ | CSS token + 6개 대시보드 헤더 |
| ModuMark 심볼 노출 | ✅ | 6개 위치 (대시보드/마이/스플래시 등) |

---

## 백엔드 연결 현황 (Supabase)

| 항목 | 상태 | 비고 |
|------|------|------|
| Supabase 클라이언트 초기화 | ✅ | `src/lib/supabase.js`, supabase-js 2.110.0 |
| 기기 ID (임시 사용자 식별) | ✅ | `getDeviceId()` — localStorage UUID, 로그인 전 사용 |
| **listings 테이블** | ✅ | E1Step5 "매물 공개" → INSERT. 주소·층·면적·보증금·권리금·AI초안·시설 등 전체 저장 |
| **Supabase Storage (사진)** | ✅ | E1Step4 사진 업로드 → "Modu Apps" 버킷. 공개 URL 반환. 삭제(×) 연동 |
| **주소 검색 (Daum Postcode)** | ✅ | E1Step1 바텀시트 임베드 방식. 상세주소 입력 자동 포커스 |
| **conversations 테이블** | ✅ | E2 "DM 문의하기" → 대화방 생성·중복 재사용. listing_name·emoji 저장 |
| **messages 테이블** | ✅ | D4Chat 메시지 전송 → INSERT. 낙관적 업데이트 + 실패 시 롤백 |
| D4Inbox 실시간 목록 | ✅ | Supabase Realtime 구독. 새 대화 자동 반영 |
| D4Chat 실시간 수신 | ✅ | messages 채널 구독. 상대방 메시지 자동 표시 |
| 연락처 교환 상태 | ✅ | conversations.contact_status 업데이트 (requested → accepted) |
| **profiles 테이블** | ✅ | 신규/기존 유저 분기용. 로그인 후 category 저장 → 재방문 시 바로 대시보드 |
| **AuthContext** | ✅ | `src/contexts/AuthContext.jsx`. `useAuth()` 훅으로 전역 로그인 상태 관리 |
| **AuthCallbackPage** | ✅ | `/auth/callback` 라우트. profiles 체크 → 신규: 프로필 생성 후 대시보드 / 기존: 바로 대시보드 |
| **이메일 Magic Link** | ✅ (개발용) | A4 하단 이메일 입력 → `signInWithOtp` → 링크 클릭 → 자동 세션. 개발 임시 수단 |
| **로그아웃** | ✅ | MyPage → 로그아웃 버튼 → `supabase.auth.signOut()` → A2 이동 |
| **개발용 로그인 배지** | ✅ | MyPage 프로필 아래 `🟡 로그인됨: (이메일)` 표시 (출시 전 제거 예정) |
| RLS 설정 | ⚠️ 개발용 | 모든 테이블·Storage: `allow_all` 정책 (anon/authenticated 전체 허용) |

---

## 카카오 로그인 진행 현황

### 완료된 설정
| 항목 | 상태 |
|------|------|
| 카카오 앱 ID | `1501395` |
| 카카오 로그인 활성화 | ✅ ON |
| OpenID Connect 활성화 | ✅ ON |
| REST API 키 → Supabase 입력 | ✅ |
| Client Secret → Supabase 입력 | ✅ |
| Redirect URI 연결 (Kakao → Supabase) | ✅ |
| 동의항목: 닉네임 (profile_nickname) | ✅ 필수동의 |
| 동의항목: 프로필 이미지 (profile_image) | ✅ 설정됨 |

### 현재 막힌 지점
**KOE205 에러** — `account_email` 동의항목 미설정

- Supabase GoTrue가 카카오 OAuth 요청 시 `account_email` 스코프를 서버에서 강제로 추가함
- `account_email`은 카카오 비즈앱(사업자 인증) 없이는 동의항목 설정 자체가 불가
- 클라이언트 코드(`scopes` 옵션)로는 제거 불가 — GoTrue 서버 레벨에서 추가됨

### 다음 할 일 (순서대로)
1. **scope에서 이메일 제거 방법 확인** → 로그인 성공 여부 재확인
2. **Supabase URL Configuration** → Redirect URLs에 `http://localhost:5173/**`, `http://localhost:5174/**` 추가 필요
3. **로그인 후 redirect 처리** → AuthCallbackPage에서 profiles 체크 후 대시보드 이동 (코드 완성됨, 테스트 필요)
4. **user_id 데이터 귀속** — 로그인 완료 후 listings·conversations의 임시 device_id를 실제 auth.uid()로 교체
5. **카카오 비즈앱 전환** → 승인 후 `account_email` 선택동의 설정 → 완전 해결

### 근본 해결책
- **단기**: 카카오 비즈앱(사업자등록증) 신청 → 심사 2~5일 → 승인 후 즉시 해결
- **대안**: 커스텀 카카오 SDK + Supabase Edge Function (GoTrue 우회)

---

### ⚠️ 출시 전 필수 보안 작업

> 현재는 **개발 편의상** 누구나 모든 데이터를 읽고 쓸 수 있는 상태입니다.  
> 실서비스 전 아래를 반드시 교체해야 합니다.

| 대상 | 현재 | 교체 후 |
|------|------|---------|
| `listings` RLS | allow_all | `user_id = auth.uid()` 본인 매물만 수정/삭제 |
| `conversations` RLS | allow_all | `sender_id = auth.uid() OR receiver_id = auth.uid()` |
| `messages` RLS | allow_all | 해당 conversation 참여자만 읽기/쓰기 |
| Storage "Modu Apps" RLS | allow_all | `auth.uid()` 소유 객체만 삭제 가능 |
| `getDeviceId()` | localStorage UUID | Supabase Auth UID로 교체 |

---

## 기타 세팅 현황

| 항목 | 상태 |
|------|------|
| Remote Control (원격 개발 세팅) | ✅ |
| 브랜드 자산 (ModuMark, 컬러 토큰) | ✅ 심음 / 최종 색상 선택 대기 |

---

## 다음 후보 (우선순위)

| 우선순위 | 항목 | 내용 |
|----------|------|------|
| 🔵 | E1 새로고침 임시저장 | `E1Context`가 순수 `useState`(인메모리) → 새로고침 시 입력값 전부 소실. `sessionStorage` 또는 `useReducer+persist` 도입 필요 |
| 🔵 | 사진 없는 매물 완성도 로직 | E1/4 "다음" 버튼이 사진 유무와 무관하게 항상 활성 → 사진 없이 저장 허용됨. 완성도·노출 불이익 soft 경고 추가 검토 |
| 🔵 | /e1/5 직접 URL 진입 가드 | `/e1/3`과 달리 `/e1/5`는 가드 없음 → 빈 E1Context로 접근해 빈 매물 저장 가능. `/e1/1` 리다이렉트 또는 필수값 검증 추가 필요 |
| ⚪ | 공공데이터 API 키 보안 | `.env`의 `VITE_PUBLIC_DATA_KEY`가 평문 노출 — 키 재발급 + 서버사이드 Proxy 이전 (브라우저 노출 차단) |
| ⚪ | 카카오 로그인 KOE205 | 오늘 보류. 비즈앱(사업자 인증) 전환 후 재시도 예정. 인증 게이트(`/auth-gate`)는 트리거 기반으로 대체 운영 중 |

---

## 준비중 항목 (의도적 미구현)

- **카카오 로그인** — KOE205 에러로 중단. 비즈앱 전환 후 재시도 예정 (코드는 완성됨)
- **네이버 로그인** — Supabase 기본 provider 없음. 커스텀 구현 필요. 비즈앱 전환도 필요
- **애플 로그인** — Apple Developer 계정 필요 ($99/년). 계정 확보 후 연결 가능
- **휴대폰 번호 로그인** — 한국 SMS 제공사(NHN Cloud SENS 등) 계약 필요
- **user_id 데이터 귀속** — 현재 listings·conversations·messages가 device_id(임시) 기반. 로그인 완료 후 auth.uid() 기반으로 교체 필요
- **다른 카테고리 매물 저장** — E1p(임대인 상가), E1b(기업회원) Supabase 미연결 (E1 양도자만 연결됨)
- **공공데이터 자동채움** — 주소 입력 후 건축물대장 자동채움 미연결
- 로그아웃 / 회원탈퇴 (Auth 연결 전)
- 결제 수단 실등록 (PG 연동 전)
- Push 영업 실발송 (알림 인프라 전)
- 커뮤니티 채팅방 실시간 메시지 (현재 D4Chat만 Realtime 연결)
- 프리미엄 멤버십 구독 결제
- 노출 3층 (무료/프리미엄/광고) 실로직
- E2 매물 상세 — Supabase listings에 저장된 실제 사진 표시 (현재 더미 이미지)

---

## 브랜드 자산 현황

| 자산 | 상태 |
|------|------|
| Primary Blue: #0E6589 | ✅ CSS `--color-brand-blue` 토큰 |
| 9개 컬러 토큰 | ✅ `src/index.css` @theme 블록 |
| Pretendard 폰트 | ✅ CDN (index.html) |
| ModuMark SVG 컴포넌트 | ✅ `src/components/ModuMark.jsx` |
| favicon.svg | ✅ ModuMark 기반 |
| 반경/그림자 토큰 4개 | ✅ |
