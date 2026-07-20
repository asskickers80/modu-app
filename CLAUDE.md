@docs/PRODUCT-PRINCIPLES.md

# 모두(modu) 작업 헌법

## 호칭·보고
- 사용자를 "대표님"으로 호칭한다.
- 표준 보고는 네 줄: (1) N passed (2) 커밋 해시 (3) git status clean 여부 (4) 이슈/발견 한 줄.
- 실패·전제 불일치 시에만 자세히 보고한다.

## 증거 규칙 (절대)
- 테스트는 반드시 실제 실행하고 실제 출력(N passed 줄)을 인용한다.
  "실행하면 됩니다" 류의 안내로 대체 금지.
- 조사 보고는 파일명:줄번호 + 실제 코드 인용으로 뒷받침한다. 추측 금지.
- 작업 전제가 실제 코드와 다르면, 작업을 만들어내지 말고 멈추고 사실대로 보고한다.

## 커밋 규율
- 조각 단위로 커밋한다. 테스트 통과 전 커밋 금지.
- 지시된 파일만 스테이징한다. 그 외 변경이 있으면 커밋에 섞지 말고 목록만 보고.
- 커밋 후 git status 를 확인해 clean 여부를 보고에 포함한다.
- push 전 git remote -v 로 원격이 asskickers80/modu-app 인지 확인한다. 다르면 push 를 중단하고 보고.
- 작업 세션 종료 시 반드시 커밋+push 한다. 윈도우/맥 2기기 병행 환경이라 push 누락 시 반대 기기에서 작업이 유실된다.

## 완료 검증
- "작업 완료" 보고는 npm run build 성공 + Playwright 전체 통과를 확인한 뒤에만 한다.
- 하나라도 실패하면 완료라고 하지 말고, 실패 내역(실제 출력 인용)과 함께 "미완료"로 보고한다.
- 코드 변경이 미커밋 상태로 남아 있으면 Stop 훅이 경고를 띄운다 (.claude/hooks/stop-verify.ps1).

## 진행 상태 파일 (PROGRESS.md)
- 루트 PROGRESS.md 가 프로젝트별(모두 / contract-app) 현재 진행 상태·다음 할 일·미해결 이슈의 단일 현황판이다.
- /조각 완료(커밋)마다 해당 프로젝트 섹션을 갱신한다. 세션 마감(/마감) 때도 최종 상태로 갱신한다.
- 상세 이력은 docs/STATUS.md, 현재 스냅샷은 PROGRESS.md — 역할을 섞지 않는다.

## 범위·판단
- 작업 전 docs의 스펙 문서를 기준으로 삼는다. 스펙과 구현이 다르면 임의로 맞추지 말고 차이를 보고한다.
- 지시받은 조각만 한다. 다음 단계로 임의 진행 금지.
- 설계 판단이 필요한 지점(스키마 변경, 데이터 모델, UX 방향)은 진행하지 말고
  선택지를 정리해 대표님께 질문한다.
- DB 스키마 변경(콘솔)은 절대 직접 하지 않는다. 필요한 SQL만 제시한다.
- 실 DB에 검증 목적 쓰기(INSERT/UPDATE) 절대 금지. 제약·스키마 확인은 읽기 조회 또는 information_schema로.
  쓰기가 필요한 검증은 SQL 제시 후 대표 실행.

## 품질 원칙
- 실데이터가 없는 항목에 가짜 숫자·더미 표시 금지. 숨기거나 뺀다.
- 테스트에 외부 API 실호출 금지 (mockGemini, mockMarketData 사용).
- 단언을 느슨하게 해서 테스트를 통과시키는 방식 금지. 조건을 고정한다.
- 판정 로직 추가 시 실데이터에서 참·거짓 양쪽 케이스 확인 후 증빙 포함.
  (mock만 보고 통과시키면 앱이 그 필드를 더 이상 쓰지 않는 경우를 놓친다)
- Gemini 호출을 늘리는 변경은 반드시 보고에 명시한다.

## 서브에이전트
- 조사는 explorer, 테스트 실행은 test-runner를 사용한다.

---

# 프로젝트 참고 (분석 기반 — 2026-07-18)

> 프로젝트 목적·카테고리 6종·핵심 제품 원칙은 상단 임포트된 `docs/PRODUCT-PRINCIPLES.md` 참조.
> 진행 현황·다음 후보는 `docs/STATUS.md` 참조 (세션 마감마다 갱신).

## 자주 쓰는 명령어

```bash
npm run dev              # Vite 개발 서버 (5173)
npm run build            # 프로덕션 빌드
npm run lint             # oxlint
npx playwright test --reporter=line          # 전체 테스트 (반드시 프로젝트 루트에서 — 아니면 "No tests found")
npx playwright test tests/explore.spec.js    # 단일 스펙
npx playwright test -g "테스트 이름"          # 이름으로 필터
npm run test:ui / test:headed                # UI 모드 / 브라우저 표시
```

- 배포: `git push origin main` → Vercel 자동 배포. `/api/*`는 서버리스 함수(SPA rewrite가 가리지 않음).
- 정식 접속 주소는 `src/lib/appOrigin.js`의 `CANONICAL_ORIGIN` 하나로 고정 (배포별 고유 주소는 카카오 KOE006 유발).

## 폴더 구조

```
api/                  Vercel 서버리스 함수 — kakao-auth.js·naver-auth.js (OAuth 토큰 교환, CORS 우회)
src/
  screens/            화면 (라우트당 1파일). 명명: A=온보딩·홈, E1=양도 매물등록 4단계,
                      E1p=임대인 5단계, E1b=기업회원 5단계, E2/E2L=매물·상가 상세, D4=메시지.
                      하위 폴더: e1/ e1p/ e1b/ d4*/ business/ operating/
  lib/                도메인 로직 — auth.js(로그인 후처리) userProfile.js(멀티프로필)
                      supabase.js(클라이언트+기기ID) gemini.js(AI) categories.ts·regions.ts(분류 상수)
                      completeness.js(완성도 점수) kakao.js·naver.js·appOrigin.js(OAuth 상수)
  hooks/              useProfileRouteSync(칩·화면 불일치 방지) useProfileSwipe(전면 스와이프 전환)
  contexts/           AuthContext(로그인 상태 + 로그아웃 로컬 초기화)
  components/         공용 UI — ProfileChips, ModuMark(심볼), ModuSpinner, TrustBadges 등
tests/                Playwright 스펙 (+ seller/ 하위). fixtures.js·helpers.js가 공용 mock
docs/                 스펙·현황 문서 (PRODUCT-PRINCIPLES, STATUS, INDUSTRY-CATEGORY-MAP 등)
scripts/              보조 스크립트 (gen-icons.mjs — sharp 사용)
```

## 아키텍처 핵심 (여러 파일에 걸친 구조)

- **신원 모델**: 모든 데이터(매물·대화·메시지·커뮤니티)는 기기 ID(localStorage `modu_device_id`) 기준으로 조회/저장.
  로그인하면 `lib/auth.js`가 계정 기준 기기 ID(auth user_metadata.device_id)로 동기화·병합 — 기존 조회 로직 무변경으로 계정 단위 동작.
  `finishLogin()`이 로그인 후처리의 단일 관문 (프로필 복원·온보딩 답변 병합·멀티프로필 등록·대시보드 이동).
- **소셜 로그인**: Supabase 프로바이더를 쓰지 않는 커스텀 OAuth. 토큰 교환은 브라우저 CORS 불가 →
  프로덕션 `api/` 함수, 개발은 vite 프록시(`/kauth` `/kapi` `/nid` `/napi`). Supabase 계정은 내부 이메일
  (`kakao_{id}@kakao.modu.internal`) 패턴. 네이버 키 미설정 환경(로컬·테스트)은 더미 통과 경로가 유지된다.
- **멀티프로필**: 역할(카테고리) 목록은 localStorage `modu_profiles` (`lib/userProfile.js`).
  라벨·색·홈 경로의 단일 소스는 `CATEGORY_CONFIG`. A2 다중 선택 시 대표 역할만 온보딩하고 나머지는
  pending 등록 → 전환 시 A3 보완 모드(`/a3/{cat}?complete=1&pid=`)로 질문 후 확정.
  각 대시보드는 `useProfileRouteSync`로 라우트와 활성 프로필을 자동 일치시킨다 (뒤로가기 불일치 방지).
- **온보딩 → 가입 데이터 흐름**: A3 답변은 navigate state로 A4에 전달 → 소셜 이탈 전 localStorage
  `modu_onboarding_answers`에 보관 → `finishLogin`이 소비 (신규=프로필 생성, 기존=병합 또는 역할 추가).
  앱 전환 왕복(카카오)에서 sessionStorage는 초기화되므로 왕복 생존 데이터는 반드시 localStorage.
- **Supabase**: listings·conversations·messages·profiles·community_* 테이블. RLS는 울타리 수준(DELETE 차단).
  스키마 변경은 헌법대로 SQL 제시만 — 실행은 대표님 콘솔.

## 테스트 절차

- `tests/fixtures.js`의 전역 가드가 모든 Supabase 쓰기(POST/PATCH/DELETE)를 기본 차단.
  쓰기가 필요한 테스트는 스펙에서 `page.route()` mock 추가 (Playwright LIFO라 나중 등록이 가드를 오버라이드).
- 외부 API는 `tests/helpers.js`의 `mockGemini`·`mockMarketData` 사용 — 실호출 금지 (헌법).
- import는 `@playwright/test`가 아니라 `./fixtures.js`에서.
- reducedMotion 등 컨텍스트 옵션은 playwright.config.js의 `contextOptions`에 (top-level `use`는 미적용).
- 더미 경로 통과 ≠ 실 OAuth 왕복 검증 — 외부 앱 왕복이 끼는 기능은 저장소 생존까지 확인.

## 작업 절차 (요약)

1. 조각 시작 전 docs 스펙 확인 → 전제가 코드와 다르면 멈추고 보고.
2. 구현 → 테스트 서브에이전트로 전체 실행 (실출력 인용) → 통과 후 지시된 파일만 커밋 → PROGRESS.md 해당 섹션 갱신.
3. push는 PowerShell로 직접 (`git push origin main`) → Vercel 자동 배포. push 전 git remote -v 확인.
4. 네 줄 보고: N passed / 커밋 해시 / git status clean / 이슈 한 줄.
5. 세션 종료 시 /마감 — docs/STATUS.md·PROGRESS.md 갱신 후 "docs: update STATUS" 커밋.
