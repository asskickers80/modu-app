# 모두(Modu) — 개발 현황 STATUS.md

> 최종 업데이트: 2026-07-01 (2차)  
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
| RLS 설정 | ⚠️ 개발용 | 모든 테이블·Storage: `allow_all` 정책 (anon/authenticated 전체 허용) |

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

## 준비중 항목 (의도적 미구현)

- **로그인** — 실제 소셜 로그인 (카카오/네이버/Apple OAuth) 미연결. 현재 localStorage UUID로 임시 대체
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
