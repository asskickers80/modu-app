# 오더: 맥 환경 정비 — Claude Code 첫 세션 과제 (2026-07-20)

## 배경

- 개발 환경이 윈도우 PC → 맥북으로 이전 완료 (클론 + .env + 전체 테스트 167개 통과 확인)
- 이후 두 기기 병행 사용 가능성 있음
- contract-app은 별도 저장소·웹 전용 파이프라인이므로 이번 작업 범위 아님 (건드리지 말 것)

## 과제 4개

### 1. 훅 크로스플랫폼 전환

- 현재 `.claude/hooks/*.ps1` (PowerShell)은 맥에서 미작동
- session-start(git pull), stop-verify(완료 검증) 각각 동일 동작의 `.sh` 버전 작성
- `.claude/settings.json`에서 OS에 따라 맞는 스크립트 실행되도록 분기
- 윈도우 동작이 깨지면 안 됨 — 기존 `.ps1` 유지
- 검증: 맥에서 새 세션 시작 시 git pull 실행 로그 확인

### 2. 맥용 시작 스크립트

- `모두서버시작.command` 생성 (윈도우 `모두서버시작.bat` 대응)
- 동작: modu-app 이동 → dev 서버 `--host` 기동, 더블클릭 실행 가능하게 `chmod +x`
- 네트워크 IP 안내 출력 포함 (아이폰 접속용)

### 3. CLAUDE.md 규칙 추가

- "작업 세션 종료 시 반드시 커밋+push. 윈도우/맥 2기기 병행 환경 — push 누락 시 반대 기기에서 작업 유실됨"
- 기존 원격 검증 규칙(asskickers80/modu-app 확인) 바로 아래에 배치

### 4. 잔정리

- 루트의 `env.example` 중복본 삭제 (`.env.example`이 정본)
- `package.json` name: `"tmp-init"` → `"modu-app"` 정정
- 수정 후 `npm install` 재실행해 lock 파일 갱신 여부 확인

## 완료 기준

- 전체 Playwright 스위트 통과 유지 (기준: 167개)
- 맥에서 훅 동작 확인 (세션 시작 pull)
- 보고 4줄 형식 (테스트/커밋 해시/push/이슈)
