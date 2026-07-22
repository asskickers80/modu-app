# LOGIN-DEBT.md — 인증·소유권·게이트 기술부채 (2026-07-22 갱신)

> 이번 세션(방문자 게이트~로그인 세션 진단) 과정에서 드러난 인증 계층 부채를 한 곳에 모은다.
> 각 항목: 현황 / 부채 / 근거(커밋·맥락) / 수정 방향. 실행은 대표와 함께(인증 무인 금지).
> 기준 설계는 `docs/IDENTITY-MODEL.md`.

## 1. 행동 게이트 `!user` 기준으로 완전 이관 — ✅ 상환 (ORDER-identity-model-v1)
- **처리**: E2/E2L 문의 게이트를 `!user` 단독으로 통일(역할/category 신호 폐기). 찜도 동일 게이트.
  세션 시드(`tests/helpers.js seedSession`)로 문의 흐름 테스트를 "로그인 문의자"로 표현하도록 전환.
- **잔여**: 등록(E1)·마이 일부의 "계정 필요" 판정은 화면별로 남아 있음 — 필요 시 같은 `!user` 기준으로 이어서 통일.

## 2. mergeDeviceData의 messages.sender_id 재기입 실패 방치 — ✅ 부분 상환
- **처리**: `mergeDeviceData`를 `Promise.all`+`catch{}`(삼킴)에서 **연산별 1회 재시도 + 실패 로깅**으로 교체(커밋 이 세션). messages.sender_id 실패를 더는 조용히 버리지 않음.
- **잔여**: `syncCanonicalDeviceId`는 여전히 merge 성패와 무관하게 device_id를 교체(비원자적). 완전 원자화는 아래 6(RLS user_id) 이관 시 함께 — 그때 device_id 앵커 의존 자체를 축소.

## 3. 고아 sender_id 데이터 정리 (SQL — 대표 콘솔) — 진단 SQL 제시됨, 실행 대기
- **부채**: 위 2로 생긴 고아 messages.sender_id를 conversation 참가자 기준으로 정정.
- **진단 SQL**: `docs/SQL-identity-model.sql` §2 (대표 실행 → 결과 있으면 케이스별 UPDATE 제시, 자동 정정 금지).

## 4. Confirm email 재활성 + 확인 플로우
- **현황**: Supabase "Confirm email" **OFF**(대표 확인). 그래서 내부 소셜 이메일(`kakao_{id}@kakao.modu.internal`)도 세션 즉시 발급되어 로그인 동작.
- **부채**: 실 이메일 가입자에 대한 확인 절차 부재(스팸·오타 계정 유입). 재활성 시 소셜 내부계정은 확인을 우회해야 함(아래 5).
- **수정 방향**: Confirm email ON + 이메일 가입은 확인 메일 플로우(A4 이미 `data.session` 분기 존재), 소셜은 5안.

## 5. 카카오 콜백 B안 (service_role admin.createUser)
- **현황**: 콜백이 anon `signUp`/`signInWithPassword`로 세션 수립(`AuthKakaoCallbackPage.jsx`).
- **부채**: Confirm email 재활성 시 내부 이메일이 미확인이라 세션 불가. 또 콜백이 세션 없어도 user.id만으로 진행(성공 위장 가능).
- **수정 방향**: 서버 함수에서 **service_role `admin.createUser({email_confirm:true})`** 로 소셜 계정 확정 생성 후 세션 발급. 콜백은 세션 없으면 실패 처리.

## 6. RLS user_id 전환 (소유권 판정 이관 포함)
- **현황**: 소유권은 `lib/ownership.js` `isOwnerOf` = device_id 비교. RLS는 울타리 수준(DELETE 차단).
  `listings.user_id` 컬럼 SQL은 `docs/SQL-identity-model.sql` §3으로 제시(대표 실행 대기). migrateDeviceId가 이미 그 컬럼에 씀.
- **부채**: "이 브라우저가 만든 객체 = 이 계정 소유"라 공용기기·계정전환에서 취약. business_number 등 비공개 컬럼도 anon 직접조회 시 읽힘(PROGRESS 보안 부채).
- **착수 조건**: §3 컬럼 생성 확인 후 → `isOwnerOf`를 user_id 우선(+device 폴백)으로, 이어서 정식 RLS(컬럼/뷰 차단, 배치 service role 분리).

## 7. 찜/저장 게이트 + 영속화 — ✅ 게이트 상환, 영속화 대기
- **처리**: E2 찜을 `!user` 행동 게이트로 전환(찜 전용 문구 + returnTo 보존). 로그인 상태면 토글(`aria-pressed`). 테스트 `tests/guest-access.spec.js`.
- **잔여**: 로그인 후 서버(찜 테이블) 영속화는 미구현 — 스키마 필요(대표). 현재는 세션 내 로컬 토글까지.

## 8. 계정 통합 (중복 계정 수렴) — 진단·SQL 제시, 실행 대기
- **현황**: 카카오 로그인은 내부 이메일(`kakao_{id}@…internal`)이라 실이메일 가입 계정과 자동 매칭 불가 → 같은 사람이 입구별로 계정 분리 가능(김태우 2계정 사례).
- **수렴 키**: 카카오 `kakao_account.email`(동의 시 실이메일 제공) → 이를 기존 이메일 계정과 대조해 연결. 미동의·미제공이면 "기존 계정에 연결" 흐름(이메일 인증)으로 수동 수렴.
- **처리**: 김태우 2계정 통합 SQL은 `docs/SQL-identity-model.sql` §1(대표 실행 대기). B계정 데이터 0이라 삭제로 충분.
- **착수 조건**: 콜백에서 `kakao_account.email` 수신 여부 확인 → 있으면 계정 연결 로직, 없으면 B안(§5)과 함께 수동 연결 UI.
