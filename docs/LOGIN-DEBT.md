# LOGIN-DEBT.md — 인증·소유권·게이트 기술부채 (2026-07-21)

> 이번 세션(방문자 게이트~로그인 세션 진단) 과정에서 드러난 인증 계층 부채를 한 곳에 모은다.
> 각 항목: 현황 / 부채 / 근거(커밋·맥락) / 수정 방향. 실행은 대표와 함께(인증 무인 금지).

## 1. 행동 게이트 `!user` 기준으로 완전 이관
- **현황**: E2 문의 게이트는 `!user && (!cat || cat==='browsing')`로 수정됨(커밋 `e95fb63`). 그러나 앱 전반의 "계정 필요" 판정이 여전히 device_id/역할(category) 혼재.
- **부채**: 원래 category 단독(`!cat||browsing`)이라 방문자로 로그인해도 게이트가 떠 "로그인 안 됨"처럼 보였다(진단 ORDER-auth-session-debug-v1). 세션 시드 테스트가 가능해졌으니(`tests/more-sheet.spec.js` seedSession) 게이트 판정을 **세션(user) 기준으로 통일**.
- **수정 방향**: "계정 필요" 행동(문의·찜·등록·마이 일부)을 모두 `!user` 기준 헬퍼로 단일화. 로그인=계정 있음.

## 2. mergeDeviceData의 messages.sender_id 재기입 실패 방치
- **현황**: `lib/auth.js` `mergeDeviceData`가 6개 UPDATE를 `Promise.all`+`catch{}`로 **에러를 삼킴**. `syncCanonicalDeviceId`는 merge 성패와 무관하게 `localStorage.modu_device_id`를 canonical로 교체.
- **부채**: 소유자가 익명 등록 후 로그인 시 device_id가 바뀌는데 messages.sender_id 재기입이 실패하면, 저장된 sender_id가 참가자 어느 쪽도 아닌 **고아 id**로 남는다. D4 발신자 렌더가 이를 그대로 반영(ORDER-d4-sender-bug-v1, 커밋 `501915b`). 렌더는 참가자 기준(`lib/conversation.js`)으로 견고화해 증상은 해소했으나 데이터 부채는 존재.
- **수정 방향**: merge를 원자적으로(성공 확인 후 localStorage 교체), messages/conversations UPDATE 실패는 재시도/로깅. 근본은 아래 6(RLS user_id).

## 3. 고아 sender_id 데이터 정리 (SQL — 대표 콘솔)
- **부채**: 위 2로 생긴 고아 messages.sender_id를 conversation 참가자 기준으로 정정.
- **진단/정정 SQL** (읽기 후 대표 실행):
  ```sql
  -- 진단: 대화별 sender_id 분포가 참가자(sender/receiver)와 어긋나는지
  SELECT m.conversation_id, m.sender_id, c.sender_id AS inquirer, c.receiver_id AS owner, count(*)
  FROM messages m JOIN conversations c ON c.id = m.conversation_id
  WHERE m.sender_id <> c.sender_id AND m.sender_id <> c.receiver_id AND m.sender_id <> 'system'
  GROUP BY 1,2,3,4;
  -- 정정은 케이스 확인 후 대표와 함께 (자동 UPDATE 금지).
  ```

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
- **부채**: "이 브라우저가 만든 객체 = 이 계정 소유"라 공용기기·계정전환에서 취약. business_number 등 비공개 컬럼도 anon 직접조회 시 읽힘(PROGRESS 보안 부채).
- **수정 방향**: 매물·대화 소유권을 user_id로 이관, `isOwnerOf`를 user_id 우선(+device 폴백)으로, 정식 RLS(컬럼/뷰 차단, 배치 service role 분리).

## 7. 찜/저장 게이트 + 영속화
- **현황**: E2 찜은 로컬 토글(`setBookmarked`) — 게이트 없음, 저장 안 됨.
- **부채**: 찜은 [F] 행동 게이트 대상인데 미구현. 로그인 후 서버 저장 필요.
- **수정 방향**: 찜도 `!user`면 게이트(returnTo 보존), 로그인 시 서버(찜 테이블) 영속화(스키마 필요 → 대표).
