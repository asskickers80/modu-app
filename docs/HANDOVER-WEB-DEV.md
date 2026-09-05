# 모두(modu) 웹 개발 인수인계

> 대상: 웹 버전을 병행 개발할 신규 개발자
> 작성 2026-09-05 · 기준 커밋 `91a5cb5` · 코드 실측 기반
> ⚠️ 이 문서에는 **API 키·비밀번호가 들어 있지 않습니다.** 값은 대표님께 별도 경로로 받으세요.

---

## 0. 먼저 알아야 할 사실 3가지

### (1) 이 프로젝트는 이미 웹입니다
네이티브 앱이 아닙니다. React + Vite로 만든 **웹앱**을 모바일 화면 비율(430px)에 맞춰 만든 것이고,
PC에서 열면 화면 가운데 430px 기둥으로 보입니다(`src/App.jsx:71-73`).

따라서 "웹 버전 개발"의 실체는 **새 프로젝트 구축이 아니라 PC·데스크톱 반응형 대응**입니다.
백엔드·DB·인증·도메인 로직은 만들 필요가 없습니다. 이미 다 있습니다.

### (2) 저장소에 죽은 코드가 있습니다
`app/`, `app.json`, `babel.config.js`, `src/theme/`, `src/data/` 는 2026년 6월 Expo(React Native)로
시작했다가 웹으로 방향을 튼 뒤 남은 잔재입니다. 총 309줄, 마지막 커밋 2026-06-29,
**의존성이 설치돼 있지 않아 실행 불가**입니다. 건드리지 마세요. 참고할 가치도 없습니다.

### (3) 협업 구도
| 축 | 담당 | 작업 영역 |
|---|---|---|
| 앱(모바일 웹) 기능 개발 | 대표님 + Claude Code | `src/screens/`, `src/lib/`, `api/`, `tests/` |
| 웹(PC) 반응형 개발 | **신규 개발자(당신)** | `src/App.jsx` 레이아웃, 네비게이션, `src/index.css` |

같은 저장소를 동시에 만지므로 **11절 병행 개발 규칙을 반드시 읽으세요.**

---

## 1. 30분 안에 돌려보기

```bash
git clone https://github.com/asskickers80/modu-app.git
cd modu-app
npm install

# 대표님께 받은 .env 파일을 프로젝트 루트에 배치 (2절 참조)
cp .env.example .env   # 그 뒤 실제 값으로 채움

npm run dev            # http://localhost:5173
```

브라우저 개발자도구에서 **기기 모드(390~430px)** 로 봐야 의도한 화면이 나옵니다.

```bash
npm run build          # 프로덕션 빌드 (0.5초)
npm run lint           # oxlint
npx playwright test --reporter=line   # 전체 테스트 625개 (약 2.5분)
```

> **테스트는 반드시 프로젝트 루트에서 실행하세요.** 하위 폴더에서 돌리면 "No tests found"가 납니다.

---

## 2. 접근 권한 체크리스트 (대표님께 요청할 것)

| # | 항목 | 용도 | 요청 방법 |
|---|---|---|---|
| 1 | **GitHub 저장소** `asskickers80/modu-app` | 코드 | Collaborator 초대 |
| 2 | **`.env` 파일** | 로컬 개발 | 안전한 경로로 전달받기 (Slack DM·1Password 등, 이메일 금지) |
| 3 | **Supabase 프로젝트** | DB 스키마 확인 | 프로젝트 멤버 초대 (읽기 권한이면 충분) |
| 4 | **Vercel 프로젝트** | 배포 확인 | 필요 시. 없어도 로컬 개발 가능 |

**3번은 선택입니다.** 스키마는 `docs/SQL-*.sql`과 `scripts/sql/`에 이력이 남아 있어 읽기만으로도 파악됩니다.

### 환경변수 목록 (이름만 — 값은 `.env`로 받으세요)

| 변수명 | 용도 | 브라우저 노출 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 주소 | O |
| `VITE_SUPABASE_ANON_KEY` | Supabase 공개 키 | O |
| `VITE_GEMINI_API_KEY` | AI 소개글 생성 | O |
| `VITE_PUBLIC_DATA_KEY` | 공공데이터포털 (건축물대장·실거래가) | O |
| `VITE_DISTRICT_DATA_KEY` | 소상공인 상권정보 | O |
| `VITE_NAVER_MAP_CLIENT_ID` | 네이버 지도 | O |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 로그인 | X (서버 전용) |
| `NAVER_MAP_API_KEY` / `NAVER_MAP_API_KEY_ID` | 지오코딩 (서버) | X |
| `NAVER_SEARCH_CLIENT_ID` / `NAVER_SEARCH_CLIENT_SECRET` | 지역검색 (서버) | X |

- `VITE_` 접두사 = 브라우저 번들에 포함됨(공개). 없으면 서버 함수 전용.
- `.env`는 `.gitignore`에 있습니다. **절대 커밋하지 마세요.**
- 반응형 작업만 한다면 Supabase 2개 변수만 있어도 대부분 화면이 뜹니다.

---

## 3. 기술 스택

| 층 | 채택 | 버전 |
|---|---|---|
| UI | React | 19.2 |
| 빌드 | Vite | 8.1 |
| 스타일 | Tailwind CSS v4 (`@theme` 토큰 방식) | 4.3 |
| 라우팅 | React Router | 7.18 |
| 백엔드·DB | Supabase (PostgreSQL + Auth + RLS) | SDK 2.110 |
| 서버 함수 | Vercel Serverless | — |
| 테스트 | Playwright | 1.61 |
| 린트 | oxlint | 1.69 |
| 언어 | JavaScript(JSX) + TypeScript 2파일 | — |

**런타임 의존성 4개뿐**: React, React-DOM, React Router, Supabase.
UI 키트·차트·폼·애니메이션·상태관리 라이브러리 **전부 없음** — 자체 구현입니다.
즉 `npm install`로 받는 UI 컴포넌트가 없으니, 새 UI가 필요하면 직접 만들어야 합니다.

---

## 4. 전체 폴더·파일 구조

```
/Users/taewoo/modu-app                (대표님 맥북 기준 경로)
│
├── src/                              ★ 실제 앱
│   ├── screens/       59개 화면 (아래 5절 명명 규칙)
│   │   ├── e1/        양도인 매물등록 4단계 + Context
│   │   ├── e1p/       임대인 상가등록 4단계 + Context
│   │   ├── e1b/       기업회원 노출페이지 5단계 + Context
│   │   ├── d4/        메시지 인박스·채팅
│   │   ├── d4business/ d4landlord/ d4operating/ d4startup/   축별 인박스
│   │   ├── business/  기업회원 성과·푸시
│   │   └── operating/ 사장님 매출 카드
│   ├── components/    39개 공용 UI (카드·바텀시트·칩·헤더)
│   ├── lib/           50개 도메인 로직  ← 화면과 분리된 순수 계층
│   ├── hooks/         4개 (프로필 동기화·스와이프·안전한 뒤로가기·토스트)
│   ├── contexts/      AuthContext 1개
│   ├── assets/        이미지
│   ├── theme/         ⚠️ RN 잔재 — 사용 안 함
│   └── data/          ⚠️ RN 잔재 — 사용 안 함
│
├── api/                              ★ Vercel 서버리스 12개
│   ├── kakao-auth.js  naver-auth.js          OAuth 토큰 교환
│   ├── geocode.js     nearby-brokers.js      지도·검색
│   ├── verify-bizno.js  _ntsBusinessman.js   사업자 검증
│   ├── collect-market-news.js                크론: 뉴스
│   ├── check-business-closure.js             크론: 폐업 감지
│   ├── send-notifications.js  _notificationRules.js  크론: 알림
│   ├── compute-one-liners.js                 크론: 주간 한 줄
│   └── opendata/[...path].js                 공공데이터 프록시
│
├── tests/             96개 Playwright 스펙 (625 케이스)
│   ├── fixtures.js    ★ 전역 가드 — DB 쓰기 차단·외부 API 차단
│   ├── helpers.js     공용 mock (mockGemini·mockMarketData)
│   └── seller/        양도인 계열
│
├── docs/              96개 문서
│   ├── ARCHITECTURE.md          아키텍처 요약
│   ├── PRODUCT-PRINCIPLES.md    ★ 제품 원칙 (필독)
│   ├── IDENTITY-MODEL.md        ★ 신원 모델 (필독)
│   ├── ORDER-*.md               작업 지시서 70개 (개발 이력)
│   ├── SQL-*.sql                스키마 변경 이력
│   └── HANDOVER-WEB-DEV.md      이 문서
│
├── scripts/           보조 스크립트 (sql 이력 10개, smoke 테스트)
├── public/            정적 파일
├── .claude/           ★ Claude Code 작업 환경 (9절)
│
├── CLAUDE.md          ★★ 작업 규칙 "헌법" — 반드시 읽을 것
├── PROGRESS.md        ★ 현재 진행 상태 단일 현황판
├── README.md          ⚠️ Vite 기본 템플릿 그대로 (미작성)
│
├── package.json       vite.config.js      vercel.json
├── playwright.config.js
├── index.html
│
└── app/  app.json  babel.config.js        ⚠️ RN 잔재 — 건드리지 말 것
```

---

## 5. 프론트엔드 구조

### 화면 명명 규칙 — 파일명만 보면 위치를 압니다

| 접두 | 의미 | 개수 |
|---|---|---|
| `A1`~`A7` | 온보딩 흐름 (A1 스플래시 → A2 카테고리 → A3 축별 질문 → A4 가입 → A7 축별 홈) | 15 |
| `E1` / `E1p` / `E1b` | 등록 흐름: 양도인 매물 / 임대인 상가 / 기업회원 업체 | 16 |
| `E2` / `E2L` | 상세: 매물 / 상가 | 2 |
| `D4` | 메시지 (축별 인박스 5종 + 공용 채팅) | 7 |
| `Auth*` | 로그인 콜백 4종 | 4 |
| 기타 | 마이·탐색·커뮤니티·알림·개발메뉴 | 15 |

### 사용자 카테고리 6종 (각 고유 색)
양도인(네이비) · 창업자(스카이블루) · 임대인(딥틸) · 사장님(포레스트그린) ·
방문자(그레이) · 기업회원(딥퍼플)

색·라벨·홈 경로의 **단일 소스는 `src/lib/userProfile.js`의 `CATEGORY_CONFIG`** 입니다.
색을 하드코딩하지 말고 반드시 여기서 가져오세요.

### 레이아웃 (당신이 바꿀 핵심 지점)
```jsx
// src/App.jsx:70-76
<div className="flex justify-center min-h-screen bg-gray-100 overflow-x-hidden">
  <div className="w-full sm:max-w-[430px] min-h-screen relative shadow-sm"
       style={{ backgroundColor: pageBg }}>
    {children}
  </div>
</div>
```
이 `sm:max-w-[430px]`가 모바일 폭 고정의 정체입니다. **PC 대응의 출발점**입니다.

### 디자인 토큰
- **타이포**: `src/index.css`에 17단계 (`--text-t8`=9px ~ `--text-t22`). 클래스는 `text-t14` 형태
- 하드코딩 `text-[16px]` 금지 — 40~60대 가독성 기준으로 전체 조정한 이력이 있습니다
- 터치 타깃 최소 44px (시각 크기와 터치 영역을 분리하는 패턴 사용)

---

## 6. 백엔드/API 구조

**자체 백엔드 서버 없음.** Supabase(BaaS) + Vercel 서버리스 조합입니다.

서버 함수가 하는 일은 세 가지뿐:
1. **CORS 우회** — OAuth 토큰 교환, 공공데이터 호출 (브라우저에서 직접 불가)
2. **키 은닉** — 서버 전용 키를 쓰는 호출
3. **정기 배치 4종**

| 크론 | 주기(UTC) | 역할 |
|---|---|---|
| `collect-market-news` | 매일 20:00 | 시장 뉴스 수집 |
| `check-business-closure` | 매주 월 20:00 | 국세청 폐업 감지 → 매물 자동 비공개 |
| `send-notifications` | 매일 20:30 | 알림 생성 |
| `compute-one-liners` | 매주 일 21:00 | "이번 주 한 줄" 계산 |

그 외 데이터 읽기·쓰기는 **브라우저가 Supabase를 직접 호출**합니다.

**개발 환경 프록시**: `vite.config.js`가 `/api/opendata`·`/kauth`·`/kapi`·`/nid`·`/napi`를
외부로 넘깁니다. 프로덕션에서는 `api/` 서버리스 함수가 같은 경로를 받습니다.

---

## 7. 데이터베이스

**Supabase PostgreSQL**, 실사용 16개 테이블.

| 묶음 | 테이블 |
|---|---|
| 매물 | `listings`, `listing_close_surveys`, `franchise_brands` |
| 대화 | `conversations`, `messages` |
| 사용자 | `profiles`, `premium_grants` |
| 사장님 운영 | `daily_sales`, `fixed_costs` |
| 커뮤니티 | `community_posts`, `community_comments` |
| 콘텐츠·알림 | `daily_contents`, `market_news`, `notifications`, `weekly_one_liners` |
| 분석 | `events` |

### 절대 규칙 ⛔
- **스키마 변경(콘솔 DDL)은 직접 하지 않습니다.** 필요한 SQL을 제시하고 대표님이 실행합니다.
- **실 DB에 검증 목적 쓰기(INSERT/UPDATE) 금지.** 확인은 읽기 조회 또는 `information_schema`로.
- 마이그레이션 도구를 쓰지 않습니다. 변경 이력은 `docs/SQL-*.sql`·`scripts/sql/`에 파일로 남깁니다.

**보안 현황**: RLS는 "울타리 수준"(읽기·쓰기 개방, 삭제만 차단). 사용자별 행 격리는 미적용 — 알려진 부채입니다.

---

## 8. 로그인/회원가입/인증 구조

Supabase 기본 소셜 프로바이더를 **쓰지 않고 직접 구현**했습니다.

```
카카오/네이버 버튼
  → 인증 페이지로 이동 (window.location.replace — 히스토리 오염 방지)
  → 콜백 페이지가 code 수신
  → api/kakao-auth 서버 함수가 토큰 교환 (CORS 때문)
  → 받은 프로필로 내부 이메일 계정 생성/로그인
     (supabase.auth.signInWithPassword → 실패 시 signUp)
  → lib/auth.js 의 finishLogin() 이 프로필 복원·병합·이동 처리
```

### ★ 신원 모델 (이 프로젝트에서 가장 중요한 구조 — `docs/IDENTITY-MODEL.md` 필독)

> 모든 데이터(매물·대화·매출)는 **기기 ID**(localStorage `modu_device_id`) 기준으로 저장된다.
> 로그인하면 계정에 묶인 기기 ID로 동기화·병합된다.

- **로그인 없이도 앱 전체가 동작**합니다. 나중에 로그인하면 그동안 만든 데이터가 계정으로 합쳐집니다.
- `finishLogin()` 한 곳이 이 병합의 **단일 관문**입니다. 인증 관련 수정 시 여기부터 보세요.
- **멀티프로필**: 한 사람이 양도인·사장님·임대인을 동시에 가질 수 있고 상단 칩으로 전환합니다.
  역할별 사업체 정보는 `roleData.{축}`으로 분리 저장됩니다.

### 로그인 왕복 관련 주의
브라우저 히스토리에 인증 URL이 남아 뒤로가기 무한루프가 났던 이력이 있습니다.
`src/lib/authBackGuard.js`가 "히스토리 바닥 가드"로 막고 있습니다. **이 파일을 건드리지 마세요.**

---

## 9. 현재 구현된 주요 기능

| 축 | 구현된 것 |
|---|---|
| **공통** | 온보딩(6카테고리·역할별 질문), 카카오·네이버 로그인, 멀티프로필 전환, 탐색, 커뮤니티, DM 메시지, 알림 센터, 마이페이지 |
| **양도인** | 매물등록 4단계(주소 자동채움·AI 소개글·사진·공개), 매물 상세, 진행 가이드+완성도, 문의 동향 카드, 마감 흐름(팔렸어요→설문→프리미엄), 이번 주 한 줄 |
| **임대인** | 상가등록 4단계, 상가 상세, 수익률 자동계산, 시설 현황, 완성도 배점 |
| **사장님** | 매출 관리(30초 입력·요일/주간/객단가/월 분석·고정비), 동네 밀집도, 이번 주 한 줄 |
| **창업자** | 추천 피드 |
| **기업회원** | 업체 노출 페이지 5단계, 영업 상황판 |
| **AI (Gemini)** | 매물 소개글 자동 생성(검색 그라운딩), 블록별 재작성 |
| **공공데이터** | 건축물대장 자동채움, 상권 실데이터, 실거래가, 국세청 폐업 감지·사업자 검증 |

**미구현**: 찜(관심목록), 결제, 업체 매칭 성사, 오늘 할 일(일정관리), 매출 그래프 화면.

---

## 10. 개발 규칙 — `CLAUDE.md` 요약 (반드시 준수)

이 프로젝트에는 명문화된 작업 규칙이 있습니다. **전문은 루트 `CLAUDE.md`를 읽으세요.** 핵심만:

### 증거 규칙
- 테스트는 **실제 실행**하고 실제 출력(`N passed`)을 인용한다. "실행하면 됩니다" 식 안내로 대체 금지.
- 조사·보고는 **파일명:줄번호 + 실제 코드 인용**으로 뒷받침한다. 추측 금지.
- 작업 전제가 실제 코드와 다르면, 만들어내지 말고 **멈추고 사실대로 보고**한다.

### 커밋 규율
- 조각 단위로 커밋. **테스트 통과 전 커밋 금지.**
- **지시된 파일만 스테이징.** 그 외 변경은 섞지 말고 목록만 보고.
- 커밋 후 `git status`로 clean 확인.
- 세션 종료 시 반드시 커밋+push (대표님이 맥/윈도우 2기기 병행 — push 누락 시 작업 유실).

### 품질 원칙
- **실데이터 없는 항목에 가짜 숫자·더미 표시 금지.** 숨기거나 뺀다.
- 테스트에 **외부 API 실호출 금지** (`mockGemini`·`mockMarketData` 사용).
- **단언을 느슨하게 해서 테스트를 통과시키는 방식 금지.** 조건을 고정한다.
- Gemini 호출을 늘리는 변경은 반드시 보고에 명시.

### 범위·판단
- **지시받은 조각만** 한다. 다음 단계로 임의 진행 금지.
- 설계 판단이 필요한 지점(스키마 변경, 데이터 모델, UX 방향)은 진행하지 말고 **선택지를 정리해 대표님께 질문**한다.

### 양도인(E1) 보호장치
E1(양도인) 코드는 가장 완성도가 높고 민감합니다. 건드리는 작업은:
1. 착수 전 스냅샷 스위트가 그린인 커밋을 먼저 남긴다
2. 오더가 명시한 범위 외 리팩토링 금지
3. 보고에 **"양도인 영향 diff 요약"**(바꾼 것/안 바꾼 것 + 스냅샷 전후 그린) 의무

```bash
# 양도인 스냅샷 스위트
npx playwright test tests/e1-seller-snapshot.spec.js tests/seller/ \
  tests/e1-*.spec.js tests/seller-edge.spec.js --reporter=line
```

### 테스트 작성 규칙
- import는 `@playwright/test`가 아니라 **`./fixtures.js`** 에서 (전역 DB 쓰기 가드가 걸림)
- 쓰기가 필요한 테스트는 스펙에서 `page.route()` mock 추가 (Playwright LIFO — 나중 등록이 우선)
- reducedMotion 등 컨텍스트 옵션은 `playwright.config.js`의 `contextOptions`에

---

## 11. Claude Code 작업 환경 (`.claude/`)

대표님은 Claude Code로 개발합니다. 이 폴더가 그 환경입니다. **당신이 꼭 쓸 필요는 없지만,
저장소에 있으니 무엇인지 알아두세요.**

| 파일 | 역할 |
|---|---|
| `agents/조사.md` | 코드베이스 조사 전담 서브에이전트 (읽기 전용) |
| `agents/테스트.md` | Playwright 실행 전담 서브에이전트 |
| `commands/조각.md` | "지정 범위만 구현 → 테스트 → 커밋 → 4줄 보고" 워크플로 |
| `commands/진단.md` | "조사만, 수정 금지" 워크플로 |
| `commands/마감.md` | 세션 마감 (문서 갱신 + 커밋) |
| `hooks/session-start.*` | 세션 시작 시 `git pull` |
| `hooks/stop-verify.*` | 미커밋 변경이 남아 있으면 경고 |
| `settings.local.json` | 개인 설정 — `.gitignore`에 있음 (커밋 안 됨) |

**표준 보고 형식**(대표님이 기대하는 형태): ①N passed ②커밋 해시 ③git status clean 여부 ④이슈 한 줄

---

## 12. 작업 이력

| 항목 | 값 |
|---|---|
| 개발 기간 | 2026-06-28 ~ 2026-09-05 (약 10주) |
| 총 커밋 | 466개 |
| 작업 지시서 | `docs/ORDER-*.md` 70개 |
| 스펙·설계 문서 | `docs/` 96개 |

**개발 방식**: 대표님이 `ORDER-*` 지시서를 주면 → Claude가 구현 → 테스트 전체 통과 →
커밋 → `PROGRESS.md` 갱신. 모든 기능이 이 사이클로 만들어졌습니다.

**이력을 따라가려면**: `PROGRESS.md`가 현재 상태 단일 현황판이고, `docs/ORDER-*.md`를
날짜순으로 보면 왜 그렇게 만들었는지 판단 근거까지 남아 있습니다.

---

## 13. 병행 개발 규칙 ★ (충돌 방지 — 반드시 합의)

두 사람이 같은 저장소를 동시에 만지므로 규칙이 없으면 반드시 충돌합니다.

### 영역 분리

| 영역 | 주인 | 비고 |
|---|---|---|
| `src/screens/**` | 앱 개발(대표님+Claude) | 웹 개발자는 원칙적으로 수정 금지 |
| `src/lib/**`, `api/**` | 앱 개발 | 로직·서버 — 웹 반응형과 무관 |
| `tests/**` | 앱 개발 | 단, 웹 개발자도 **통과시킬 의무**는 있음 |
| `src/App.jsx` (레이아웃부) | **웹 개발** | 라우트 추가는 앱 개발 — 사전 통보 |
| `src/index.css` | **웹 개발** | 토큰 추가 시 통보 |
| 신규 레이아웃 컴포넌트 | **웹 개발** | 새 파일로 만들면 충돌 없음 |
| `src/components/**` | **공유** ⚠️ | 가장 충돌 위험 높음 — 수정 전 통보 |

### 브랜치 전략 (권장)
```bash
git checkout -b web/responsive     # 웹 작업은 별도 브랜치
# 매일 1회 이상 main 동기화
git fetch origin && git rebase origin/main
```
- `main` 직접 push는 앱 개발 쪽이 계속 합니다(하루에도 여러 번).
- 웹 브랜치를 오래 묵히면 충돌이 커집니다. **작은 단위로 자주 병합**하세요.

### 병합 전 필수 확인
```bash
npm run build                          # 성공
npx playwright test --reporter=line    # 625개 통과 (기존 테스트를 깨지 않을 것)
```
반응형 작업이 기존 모바일 테스트를 깨뜨리는 것이 가장 흔한 사고입니다.
테스트는 기본 뷰포트로 돌아가므로, **PC 레이아웃을 추가하되 모바일 동작은 그대로 유지**해야 합니다.

---

## 14. 웹 버전 작업 — 권장 착수 순서

### 선행 정리 (이것부터)
**하단 탭 네비게이션이 11개 화면에 각각 복제돼 있습니다.**
이걸 공용 컴포넌트로 추출하지 않고 PC 레이아웃을 넣으면 11곳을 각각 고치게 됩니다.

```bash
grep -rl "NavIcon\|activeNav" src/screens/     # 대상 11개 확인
```

### 이후 순서
1. **네비게이션 공용화** — 하단 탭 추출 → PC에서는 사이드바로 분기
2. **`AppFrame` 반응형화** — `sm:max-w-[430px]` 해제, 브레이크포인트 도입
3. **목록 화면 다열 배치** — 탐색·내 매물·커뮤니티 (2~3열)
4. **바텀시트 → 모달 분기** — PC에서 화면 하단 시트는 어색함
5. **코드 분할** — 라우트별 `React.lazy` (현재 JS 단일 번들 1.17MB)

### 하지 말아야 할 것
- ❌ 새 프로젝트 생성 — 백엔드·DB·인증을 복제하게 됩니다
- ❌ Next.js 전환 — 지금은 로그인 기반 앱 성격이라 비용 대비 이득 없음
- ❌ UI 라이브러리 대량 도입 — 기존 39개 컴포넌트와 톤이 깨짐
- ❌ `app/`·`app.json`·`babel.config.js` 수정 — 죽은 RN 잔재
- ❌ `src/lib/authBackGuard.js` 수정 — 뒤로가기 루프 방지 장치

---

## 15. 알려진 기술 부채 (인수인계 시점 기준)

| # | 부채 | 영향 |
|---|---|---|
| 1 | RLS 사용자별 격리 미적용 (울타리 수준) | 보안 — 실사용자 확대 전 해결 필요 |
| 2 | JS 단일 번들 1.17MB, 코드 분할 없음 | 첫 로딩 속도 |
| 3 | 서버 데이터 캐싱 계층 부재 (화면마다 재조회) | PC에서 더 드러남 |
| 4 | 하단 탭 네비 11개 화면 복제 | 웹 작업의 선행 과제 |
| 5 | 공공데이터 API 키 클라이언트 번들 노출 | 신규 건축물대장 경로만 서버 주입 적용됨 |
| 6 | `README.md`가 Vite 기본 템플릿 그대로 | 신규 참여자 혼란 |
| 7 | RN 잔재 파일 5곳 방치 | 혼란 유발 — 정리 필요 |

---

## 16. 첫 주에 읽을 문서 순서

1. **`CLAUDE.md`** — 작업 규칙 (필수, 15분)
2. **`docs/PRODUCT-PRINCIPLES.md`** — 제품이 뭘 하려는 건지 (10분)
3. **`docs/IDENTITY-MODEL.md`** — 기기 ID 기반 신원 모델 (10분)
4. **`docs/ARCHITECTURE.md`** — 아키텍처 요약 (10분)
5. **`PROGRESS.md`** — 지금 어디까지 왔는지 (스크롤하며 훑기)
6. `src/App.jsx` → `src/lib/userProfile.js` → `src/lib/auth.js` 순으로 코드 읽기

---

## 17. 질문할 곳

- **제품·기능 판단** → 대표님
- **스키마 변경** → 대표님(콘솔 실행 권한 보유). 개발자는 SQL만 제시
- **앱 쪽 코드 맥락** → `docs/ORDER-*.md`에서 해당 기능 지시서를 먼저 찾을 것.
  판단 근거까지 적혀 있어 대부분 답이 나옵니다.
