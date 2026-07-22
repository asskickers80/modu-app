# IDENTITY-MODEL — 모두(modu) 신원 모델 (인증 수정의 기준 문서)

> 이후 모든 인증·프로필·소유권·게이트 수정은 이 문서를 기준으로 한다.

## 3층 신원 구조
1. **기기 (device_id)** — `localStorage.modu_device_id`(UUID). **비로그인 임시 신원.**
   매물·대화·메시지·커뮤니티가 전부 이 값 기준으로 조회/저장된다.
2. **계정 (auth.users)** — Supabase 인증 유저. **영구 신원.** 카카오/이메일 등 입구가 달라도 한 사람의 영구 신원.
3. **프로필 (profile_data.roles)** — 계정에 소속된 **역할 배열**(seller/landlord/…). 서버 영속.
   **활성 프로필**(지금 보고 있는 역할)은 **로컬**(`modu_user_profile`·`modu_profiles`)에만 둔다.

## 핵심 원칙
- **비로그인 = 기기가 주인**: device_id 기준으로 자유 활동(열람·임시 등록·임시 대화).
- **로그인 = 계정이 주인**: 로그인 순간 그 기기의 데이터를 계정으로 **흡수 병합**(device_id→canonical).
- **사람 = 계정 1개**: 입구(카카오/이메일)가 달라도 같은 사람이면 같은 계정으로 수렴. 중복 계정은 통합.

## 전이 5규칙
1. **비로그인 활동** — device_id로 매물/대화 생성. 소유권 = device_id.
2. **로그인 병합** — `finishLogin`이 유일 진입점.
   - 기기 데이터 → 계정(canonical device_id)로 흡수(`syncCanonicalDeviceId`/`mergeDeviceData`).
   - 프로필 = 계정 roles + 온보딩 선택 + 합류 선택 **합집합**(덮어쓰기 금지, `buildMergedProfiles`).
   - roles를 `profile_data.roles`에 서버 영속.
3. **로그인 중 역할 추가** — A3 완료/(+)에서 `syncRolesToServer`로 계정 roles에 즉시 합집합(로그아웃 불필요).
4. **기기 변경** — 다른 브라우저 로그인 시, 계정 roles로 프로필 전부 복원 + canonical device_id로 데이터 귀속.
5. **로그아웃** — 로컬 초기화(device_id 재발급). 계정 데이터는 서버에 남아 재로그인 시 복원.

## 판정 규칙 (통일)
- **행동 게이트([F])**: 문의(DM)·찜·등록·마이 = **계정 필요**. `user`(세션) 존재=통과, 부재=가입 유도. (역할/category 신호 판정 폐기 방향)
- **소유권(isOwnerOf)**: user_id 우선, device_id 폴백. (정식 전환은 listings.user_id 컬럼 + RLS 이후)
- **발신자 판정**: 대화 참가자(conversation.sender_id 앵커) 기준(`lib/conversation`), device_id desync에 견고.

## 역할 표기
로컬: `modu_user_profile`(활성 1개) + `modu_profiles`(배열). 서버: `profiles.category`(마지막 활성) + `profile_data.roles`(전체).
`roles`가 진실의 원천 — `category`는 마지막 활성 표기용.

## 알려진 부채 (docs/LOGIN-DEBT.md)
mergeDeviceData 실패 삼킴, 고아 sender_id, Confirm email 재활성, 카카오 B안, 정식 RLS(user_id 소유권) — 각 상환 조건은 LOGIN-DEBT 참조.
