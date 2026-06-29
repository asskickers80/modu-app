# 모두(Modu) — 테스트 리포트 TEST_REPORT.md

> 최종 업데이트: 2026-06-30  
> 빌드: ✅ 0 에러 / 번들: 859KB (gzip 203KB)

---

## 전체 검증 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| 빌드 에러 | ✅ 0개 | `npm run build` 통과 |
| 라우트 파일 누락 | ✅ 0개 | 48개 전부 파일 존재 |
| 죽은 AI 함수 | ✅ 0개 | 15개 전부 실제 사용 |
| 정적 텍스트 AI 페이크 | ✅ 0개 | 전부 Gemini API 실호출 |
| 하단 탭 경로 오류 | ✅ 0개 | 5개 대시보드 전부 정확 |
| onClick 없는 버튼 | ✅ 0개 | 미연결 버튼 없음 |
| 멀티프로필 흐름 | ✅ 정상 | sessionStorage relay 패턴 |

---

## A 시리즈 — 첫 진입 흐름

### A1 스플래시
- 브랜드 색 #0E6589 풀스크린 배경 ✅
- ModuMark 96px + "모두" 타이포 ✅
- 2초 후 `/a2` 자동 이동 ✅

### A2 카테고리 선택
- 6개 카테고리 칩 선택/해제 ✅
- 멀티프로필 URL 파라미터(`?multiprofile=1`) 감지 ✅
- 선택값이 A3 경로로 정확히 분기 ✅
  - seller → /a3/seller ✅
  - landlord → /a3/landlord ✅
  - startup → /a3/startup ✅
  - operating → /a3/operating ✅
  - business → /a3/business ✅
  - browse → /a7/browsing (A3 없이 바로 진입) ✅

### A3 질문 화면 (5종)
- 칩 선택값이 navigate state로 A4에 전달 ✅
  - seller: `{ category, bizType, region, transfer }` ✅
  - landlord: `{ category, region, status, count }` ✅
  - startup: `{ category, startupMode, region, budget }` ✅
  - operating: `{ category, biz, bizLabel, region, sales }` ✅
  - business: `{ category, bizType, bizTypeLabel, bizTypeEmoji, region }` ✅

### A4 가입 방식
- location.state에서 카테고리/질문 답변 수신 ✅
- 신규 가입 → `saveProfile()` → 해당 대시보드 이동 ✅
- 멀티프로필 추가 → `addProfile()` → 기존 프로필 유지 ✅
- sessionStorage 플래그 사용 후 정리 ✅

---

## A7 대시보드 — 하단 네비게이션

| 대시보드 | 홈탭 | 탐색 | 커뮤니티 | 메시지 | 마이 |
|---------|------|------|---------|--------|------|
| 양도자 | /a7/seller ✅ | /explore ✅ | /community ✅ | /d4/inbox ✅ | /my ✅ |
| 임대인 | /a7/landlord ✅ | /explore ✅ | /community ✅ | /d4/landlord/inbox ✅ | /my ✅ |
| 창업준비 | /a7/startup ✅ | /explore ✅ | /community ✅ | /d4/startup/inbox ✅ | /my ✅ |
| 운영중 | /a7/operating ✅ | /explore ✅ | /community ✅ | /d4/operating/inbox ✅ | /my ✅ |
| 기업회원 | /a7/business ✅ | /explore ✅ | /community ✅ | /d4/business/inbox ✅ | /my ✅ |
| 그냥구경 | /a7/browsing ✅ | 가입 유도 토스트 ✅ | 가입 유도 ✅ | 가입 유도 ✅ | 가입 유도 ✅ |

---

## D4 메시지 — 연락처 교환 모달

| 카테고리 | Inbox | Chat | 교환 모달 | B2C/B2B 표현 |
|---------|-------|------|---------|------------|
| 양도자 | /d4/inbox ✅ | /d4/chat/:id ✅ | ExchangeConfirmModal ✅ | "연락처 교환 완료" (B2C) ✅ |
| 임대인 | /d4/landlord/inbox ✅ | /d4/landlord/chat/:id ✅ | 있음 ✅ | B2C 표현 ✅ |
| 창업준비 | /d4/startup/inbox ✅ | /d4/startup/chat/:id ✅ | 있음 ✅ | B2C 표현 ✅ |
| 운영중 | /d4/operating/inbox ✅ | /d4/operating/chat/:id ✅ | 있음 ✅ | B2C 표현 ✅ |
| 기업회원 | /d4/business/inbox ✅ | /d4/business/chat/:id ✅ | 있음 ✅ | "매칭 성사" (B2B) ✅ |

---

## AI 기능 — 캐시 & 폴백

| 화면 | AI 함수 | 일일캐시 | 폴백 | 새로고침 버튼 |
|------|---------|---------|------|------------|
| 양도자 대시보드 | generateSellerCoaching | ✅ | 정적 문구 ✅ | ✅ |
| 임대인 대시보드 | generateLandlordCoaching | ✅ | 에러 메시지 ✅ | - |
| 창업준비 피드 | generateStartupInsight | ✅ | - | - |
| 운영중 대시보드 | generateOperatingCoaching | ✅ | - | - |
| 기업회원 대시보드 | generateBusinessCoaching | ✅ | - | - |
| 그냥구경 피드 | generateBrowsingCopy | ✅ | null → 대체 문구 ✅ | - |
| 커뮤니티 | generateCommunityInsight | ✅ | 정적 문구 ✅ | ✅ |

---

## 마이 페이지 — 블록 & 섹션

### 8블록 (⓪~⑦)
- ⓪ 내 프로필 관리: ProfileSwitchSheet 연결 ✅
- ① 멤버십·구독: /my/membership ✅
- ② 결제 수단: /my/payment-method, /my/payment-history ✅
- ③ 계약·약관 동의: /my/terms, /my/privacy ✅
- ④ 데이터 연결 관리: /my/business-cert, /my/proposal-settings ✅
- ⑤ 보안·인증: /my/identity, /my/pin, /my/devices ✅
- ⑥ 계정 정보: /my/name, /my/contact, /my/business-info, /my/social ✅
- ⑦ 고객센터·기타: /my/faq, /my/notice, /my/lab ✅

### MyDetailPage 16섹션 (모두 /my/:section 라우트)
membership, payment-method, payment-history, terms, privacy, business-cert,
identity, pin, devices, name, contact, business-info, social, faq, notice, lab — **전부 ✅**

---

## DevMenu (/dev)

- 전체 화면 링크 수: 73개 항목
- 마지막 추가: MyPage 12개 섹션 (2026-06-30, 커밋 70e0054)
- 누락된 화면: 없음 ✅

---

## 멀티프로필 — 흐름 검증

```
기존 프로필(양도자) 로그인 상태
→ ProfileSwitchSheet "새 프로필 추가"
→ /a2?multiprofile=1
→ A2: sessionStorage.setItem('modu_multiprofile_pending', '1')
→ A3 질문 선택
→ A4 가입 완료
→ addProfile(category, name) 호출 ✅
→ 기존 프로필 deactivate, 새 프로필 active ✅
→ 헤더 칩에 새 카테고리 표시 ✅
→ 다시 프로필 칩으로 전환 가능 ✅
```

---

## 준비중 (의도적 미구현, 토스트 처리됨)

| 항목 | 처리 방식 |
|------|---------|
| 로그아웃/탈퇴 | showToast('준비 중이에요 🚧') ✅ |
| 소셜 로그인 실연동 | 더미 버튼 + 토스트 ✅ |
| 공공데이터 주소 자동채움 | 함수 분리됨, 더미 응답 ✅ |
| 프리미엄 멤버십 결제 | 토스트 ✅ |
| Push 알림 실발송 | 이중 게이트 UI만 구현 ✅ |

---

## 알려진 제한사항

- **번들 크기 859KB**: 화면이 많아 한 번에 로드됨. 프로덕션 전 code-split 권장.
- **Gemini API 키**: `.env`의 `VITE_GEMINI_KEY` 필요. 키 없으면 AI 기능 폴백 작동.
- **더미 데이터**: 모든 매물/메시지/통계는 하드코딩 샘플. 백엔드 연결 후 교체 필요.
