# 모두 (modu)

한국 자영업자를 위한 AI 리테일 생태계 슈퍼앱.
점포 양도·양수, 창업, 임대, 운영, 그리고 이들을 돕는 기업회원을 하나로 잇습니다.

> **이 저장소는 웹앱입니다.** React + Vite로 만든 웹을 모바일 화면 비율(430px)에 맞춰
> 개발했습니다. 네이티브 앱은 없습니다. (`app/`·`app.json`·`babel.config.js`·
> `src/theme/`·`src/data/`는 2026-06 Expo 시도의 잔재이며 실행되지 않습니다 — 건드리지 마세요.)

---

## 시작하기

```bash
npm install
cp .env.example .env    # 실제 키 값은 관리자에게 요청
npm run dev             # http://localhost:5173
```

브라우저 개발자도구의 **기기 모드(390~430px)** 로 봐야 의도한 화면이 나옵니다.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (5173) |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | oxlint |
| `npx playwright test --reporter=line` | 전체 테스트 (**반드시 프로젝트 루트에서**) |
| `npx playwright test tests/xxx.spec.js` | 단일 스펙 |

## 기술 스택

React 19 · Vite 8 · Tailwind CSS v4 · React Router 7 · Supabase(PostgreSQL·Auth) ·
Vercel Serverless · Playwright

런타임 의존성은 4개(React, React-DOM, React Router, Supabase)뿐이며 UI·상태관리
라이브러리는 사용하지 않습니다.

## 폴더

```
src/screens/     화면 (A=온보딩, E1=매물등록, E2=상세, D4=메시지, A7=대시보드)
src/components/  공용 UI
src/lib/         도메인 로직 (화면과 분리된 순수 계층)
api/             Vercel 서버리스 (OAuth·공공데이터 프록시·크론)
tests/           Playwright
docs/            스펙·작업 지시서·SQL 이력
```

## 문서 — 이 순서로 읽으세요

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **작업 규칙 (필독)** — 증거·커밋·품질 원칙 |
| [docs/PRODUCT-PRINCIPLES.md](docs/PRODUCT-PRINCIPLES.md) | 제품 원칙·카테고리 6종 |
| [docs/IDENTITY-MODEL.md](docs/IDENTITY-MODEL.md) | 기기 ID 기반 신원 모델 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 기술 스택·구조 분석 |
| [docs/HANDOVER-WEB-DEV.md](docs/HANDOVER-WEB-DEV.md) | **신규 개발자 인수인계** |
| [PROGRESS.md](PROGRESS.md) | 현재 진행 상태 |
| `docs/ORDER-*.md` | 기능별 작업 지시서 (판단 근거 포함) |

## 배포

`git push origin main` → Vercel 자동 배포.
`/api/*`는 서버리스 함수로 라우팅되며 SPA rewrite에 가려지지 않습니다.

## 주의

- `.env`는 커밋 금지 (`.gitignore` 등록됨)
- 스키마 변경(DDL)은 직접 실행하지 않고 SQL만 제시 — 관리자가 콘솔에서 실행
- 실 DB에 검증 목적 쓰기(INSERT/UPDATE) 금지
- 테스트는 `@playwright/test`가 아니라 `./fixtures.js`에서 import
