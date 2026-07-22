# ORDER-identity-model-v1 — 신원 모델 확립 (계정 통합 + 병합 통일 + 부채 상환)

## 모드: 자율 판정. 멈춤 (a)스키마 SQL (b)실DB 정정 (c)판정 불가만.

## 0. docs/IDENTITY-MODEL.md 신설 (이후 모든 인증 수정의 기준)
3층: 기기(device_id)=비로그인 임시 / 계정(auth.users)=영구 / 프로필(profile_data.roles)=계정 소속 배열, 활성=로컬.
원칙: 비로그인=기기 주인, 로그인=계정 주인, 로그인 순간 기기→계정 흡수. 전이 5규칙. 사람=계정 1개.

## 1. 계정 통합
수렴 키(카카오 실이메일 확보 여부) 조사·제안. roles 합집합·데이터 이관·흡수계정 비활성. 김태우 2계정 조사표+통합 SQL(b).

## 2. 병합 통일 (role-persist 포함)
선택 즉시 저장, finishLogin 유일 병합 진입점, (+) 로그인 중 추가, mergeDeviceData messages 실패 삼킴 수정.

## 3. 판정 통일 (LOGIN-DEBT 선상환)
문의 게이트 user 판정, 고아 sender_id 정정 SQL(b), 찜 user 게이트, ownership user_id 우선(스키마 SQL a).

## 4. LOGIN-DEBT.md 갱신: 상환 표시 + 잔여 착수조건.

## 보고: 4줄(ls-remote) + 김태우 조사표+통합 SQL + 수렴키 근거 + 문서 2종.
