# 모두(Modu) — 개발 현황 STATUS.md

> 최종 업데이트: 2026-06-30  
> 빌드: ✅ 0 에러 (bundle 859KB gzip 203KB)

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

**총 라우트: 48개 / 에러: 0개**

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

## 준비중 항목 (의도적 미구현)

- 로그아웃 / 회원탈퇴 (백엔드 연결 전)
- 실제 소셜 로그인 (카카오/네이버/Apple OAuth)
- 공공데이터 API 실연결 (주소→건축물대장 자동채움)
- 결제 수단 실등록 (PG 연동 전)
- Push 영업 실발송 (알림 인프라 전)
- 커뮤니티 채팅방 실시간 메시지 (WebSocket 전)
- 프리미엄 멤버십 구독 결제
- 노출 3층 (무료/프리미엄/광고) 실로직

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
