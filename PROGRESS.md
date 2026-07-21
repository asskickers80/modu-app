# PROGRESS.md — 프로젝트별 현재 진행 상태

> /조각 완료(커밋)마다, 그리고 세션 마감마다 갱신한다.
> 상세 이력은 docs/STATUS.md — 이 파일은 "지금 어디까지 왔고 다음이 뭔지"의 스냅샷만.

---

## 모두 (modu) — 리테일 생태계 슈퍼앱

### 현재 상태 (2026-07-21)
- Playwright 320개 전체 통과.
- **행동 게이트 가입 온보딩 생략 (ORDER-gate-signup-skip-v1)** — [공통] 원칙: "행동 게이트 발 가입은 온보딩 생략·역할 유지·returnTo 직복귀"(v16 통찰 99). E2 문의 게이트 '가입하고 문의하기'가 온보딩 처음(/a2 역할 선택)부터 재시작하던 것을 **가입 화면(/a4) 직행**으로 변경 — `navigate('/a4', { state: { category: getProfile().category||'browsing' } })`로 역할 유지(A4는 state 없으면 seller로 오설정하므로 명시 전달). returnTo(?contact=1)는 기존 구현 재사용. 방문자 온보딩 마지막 단계 신설: A6BrowsingWelcome(`/a6/browsing`) — A2 방문자 선택 시 여기로, "가입 없이 둘러보기"(주 동선·큰 기본 버튼)/"회원가입하고 시작하기"(방문자 역할 유지 /a4 직행, 보조). 역할 미선택 경로는 browsing 기본값으로 흡수(별도 역할 선택 화면 없음 — 문의 중 역할 재질문은 마찰이라 판단). 일반 온보딩(A2→A3→A4) 무변경. Playwright 320개(seller/onboarding 방문자 환영 2케이스, guest-access 게이트→/a4 직행).
- **홈 문의 지표 재편 (ORDER-inquiry-alert-v1)** — [공통] 원칙: "문의 지표 = 새 문의(미확인) 주 표시 + 누적 서브, 읽음 판정 단일 소스"(v16 통찰 98). 문의 칸을 '새 문의(미확인)' 강조 타일로 재설계 — 미확인>0이면 네이비 강조(흰 숫자), 0이면 해제. 서브 "전체 N"(누적). 탭: 미확인 1건→그 스레드 딥링크, 2건 이상/0→인박스. **미확인 판정은 기존 `lib/unread.isUnread`(receiver_last_read_at) 단일 소스 재사용** — 메시지 탭 배지·markConversationSeen과 동일, 복제 없음. **스키마 SQL 불필요**(owner_read_at 신설 대신 이미 있는 receiver_last_read_at 활용 — 조사로 확인). '진지도'→'진척도' 명칭 교체(준비중 유지). guideSignals에 unconfirmedCount·unconfirmedThreadId 추가. Playwright 318개(문의 지표 신규 3케이스: 미확인 강조·읽음 해제·2건 인박스).
- **양도 가이드 문의 단계 재편 (ORDER-guide-merge-v1)** — [공통] 원칙: "가이드 문의 단계 = 문의받기·협의시작 2칸 구조"(v16 통찰 97). 5단계 '문의받기'(첫 문의 수신) — 완료 시 첫 문의 일시 서브텍스트("N월 N일 첫 문의 도착") + 탭하면 그 스레드로 딥링크(`/d4/chat/:firstThreadId`, 없으면 인박스). 6단계 '협의시작'(id guide-negotiate, 소유자 첫 답장=ownerReplied) — 미답장 문의 있으면 "답장을 기다리는 문의 N건" 유도(모두 화법), 탭하면 인박스. status='negotiating' 접힘 카드는 기존대로 별도 유지. guideSignals에 firstThreadId·firstInquiryAt·unansweredCount 추가. buildGuideSteps(순수함수)를 재사용 seam으로 유지(다른 프로필엔 아직 가이드 없어 크로스-프로필 config 추출은 과잉 — 판단 보류). Playwright 316개(negotiating-guide 신규 3케이스: 첫 문의 일시·딥링크·미답장 유도).
- **D4 발신자 판정 + 가이드 단계 + 문의 지표 수정 (ORDER-d4-sender-bug-v1)** — (영역1) 메시지 좌/우·아바타가 `msg.sender_id === getDeviceId()` 단독 비교라, 소유자가 익명 등록 후 로그인하며 device_id가 바뀌면(mergeDeviceData) 저장된 sender_id와 어긋나 양쪽 화면 모두 답장이 '문의자'로 렌더됐다. `lib/conversation.js` 단일 소스(viewerIsInquirer·messageFromInquirer·isMyMessage·otherPartyName)로 교체 — **문의자(conversation.sender_id)를 앵커**로 "문의자가 보낸 것/아닌 것"으로 갈라 device_id desync에 견고. D4Chat 좌우 판정 + D4Inbox/D4Landlord/D4Operating 인박스 라벨(항상 문의자 표시하던 복제 제거, 뷰어 기준 상대 표시)에 적용. (영역2) 가이드 6단계를 '가격 협의(status||답장)'→'소유자 첫 답장'(ownerReplied, 문의자 아닌 발신으로 판정) 독립 마일스톤으로, '협의 진행 중' 접힘은 **status==='negotiating' 전용**으로 재정렬. (영역3) 홈 '가게 지표'의 문의 칸을 ComingSoon 하드코딩→실카운트(inboundCount, 0이면 0). 조회·관심은 준비중 유지. Playwright 313개(d4-sender.spec.js 신규 2케이스, negotiating-guide/guide-step-navigation/coming-soon/a7dashboard/unread/demo-flow 갱신).
  - **신원 desync 잔여 부채**: 근본 원인인 mergeDeviceData(messages.sender_id 재기입 실패를 삼킴) + syncCanonicalDeviceId(merge 성패 무관하게 localStorage device_id 교체)는 이번에 손대지 않음(참가자 기준 렌더로 증상은 해소). 저장 오염 vs 클라이언트 desync 구분용 진단 SQL은 ORDER 보고 참조 — 실행 정정은 대표 콘솔.
- **문의 게이트 returnTo 오작동 + 소유자 판정 뚫림 수정 (ORDER-guest-inquiry-bug-v1)** — 원인: (1) 소유자 판정이 device_id 단독 + E2/E1 각자 복제였고, 로그인 시 syncCanonicalDeviceId가 device_id를 계정 기준값으로 바꿔 방문자가 문의→가입하면 E2가 소유자 모드로 뒤집혀 타인 매물 E1 수정에 도달(automatic E1 경로는 없음 — E2 owner-mode/대시보드 경유). (2) returnTo(/e2/:id)가 문의 의도를 잃어 복귀 후 문의 시트가 안 열림. 수정: `lib/ownership.js` 단일 `isOwnerOf(listing)` 추출 → E2 isOwner·조회가시성·조회수 + E1Context 수정 가드가 공유(복제 제거). E1 수정 비소유자(예시 포함)면 빈 신규폼 전환 대신 **E2로 리다이렉트**(수정 개방 금지). 문의 게이트 returnTo에 `?contact=1` 실어 복귀 시 비소유자면 문의 시트 자동 오픈(소유자면 무시). Playwright 308개(guest-access +2, e1-edit '남의 매물' 동작 변경).
- **방문자 열람 자유 원칙 적용 (ORDER-guest-access-v1)** — [공통] 원칙: 탐색·검색·상세·콘텐츠는 비로그인 개방, [F] 게이트는 행동(문의·찜·등록·마이) 시점에만 (v16 통찰 96 / 5-3절). 조사 결과 라우트 가드는 전무했고, 유일한 열람 차단은 방문자 홈(A7BrowsingFeed)이 하단 네비(탐색·커뮤니티·마이)와 검색·카드를 전부 가입 시트로 막던 것 하나였다. 수정: 탐색→/explore·커뮤니티→/community·마이→/my·검색→/explore 개방(메시지·알림만 계정 필요라 가입 유도 유지), 화제의 매물 카드는 실제 공개 매물 1건을 띄우고 탭하면 E2 상세 열람 개방, 나머지 준비중 카드는 '콘텐츠 준비 중' 안내(가입 강요 제거). E2 문의(DM)는 역할 미확정/방문자면 가입 게이트 시트(튕기지 않음) + 가입 후 이 매물로 복귀(lib/auth.js loginDest — modu_return_to). RLS: anon SELECT 이미 개방(별도 SQL 불필요). Playwright 306개(guest-access.spec.js 신규 4케이스).
- 사업자번호 진위확인 + 폐업 자동 감지 실서비스 가동 — 국세청 키(PUBLIC_DATA_KEY) Vercel 주입·재배포 완료, 실등록/미등록 응답 확인(verified 01 / mismatch). 폐업 배치는 매주 월 05시(KST) 크론.
- Playwright 155개 전체 통과, 라우트 37개 에러 0.
- 실 소셜 로그인 완성: 카카오(실기기 확인)·네이버(신규 앱 키)·이메일. 계정 기준 기기 ID 동기화로 브라우저가 달라도 같은 계정=같은 데이터.
- 온보딩: A2 다중 선택 B안(대표 역할 온보딩 + pending 멀티프로필), A3 양도인 업종·지역 2단계 드릴다운(전국 226 기초단체), 가입/로그인 의도 명확화(기존 계정 확인 화면).
- 프로필 칩 + 전면 스와이프 전환, 라우트-프로필 자동 동기화(불일치 구조적 차단).
- 하늘·구름 디자인 시스템 전면 적용, 역할 용어 통일(양도인·소유주·창업자·사장님·방문자).
- 하네스: SessionStart pull 훅·Stop 완료검증 훅·원격 확인 규칙·PROGRESS.md 체계 가동 (다음 세션부터 훅 발동).
- 더보기(⋯) 시트 전면 개편: [바로가기]+[객체 액션] 2그룹 공통 골격(MoreSheet + 프로필별 config), 링크 복사 삭제·실제 공유(OS 시트+복사 폴백), 미구현 항목은 라우트 존재로 자동 미노출(빈 시트면 ⋯ 미노출). Playwright 162개.
- 시장 뉴스 자동 수집: Vercel Cron 매일 새벽 5시(KST) → /api/collect-market-news (배포 실호출 검증 — saved 65). 12일 묵은 기사 문제 해소. 키워드 신선도 개선(짧은 키워드+예비 재시도)으로 13개 중 10개 업종 당일 기사.
- E1 카피 개편: '모두' 주어 화법 + ModuWord 워드마크 컴포넌트(프라이머리 볼드, 어두운 배경 tone="light"). 홈 CTA "매물 등록하기", E1 범위 사용자 노출 'AI' 0건. Playwright 164개.
- 매물 사진 정책: 내부 3장 필수(3단계 진행 차단)·합산 5장 상한(등급 config lib/memberTier.js — 프리미엄 15장 예약)·외부 사진 신상 노출 안내·품질 규정 안내. 가이드 "내부 사진 3장 이상 올리기"(내부 기준 판정). 스키마 변경 불필요(기존 interior/exterior_image_urls 컬럼 사용). Playwright 167개.
- 홈 CTA → 내 매물 카드 전환: 매물 0건이면 네이비 등록 CTA(온보딩 장치), 1건 이상이면 내 매물 카드가 CTA 자리를 대체하고 신규 등록은 "+ 새 매물 등록" 보조 버튼으로 격하. 2건 이상은 "매물 N건" 요약 → /my/listings 리스트 신설. example 매물은 0건 취급. 기존 '📋 내 공개 매물' 섹션은 카드에 흡수(중복 제거). 홈 카드=주 진입점 / 더보기 시트=바로가기 보조로 역할 확정(더보기 무변경). Playwright 179개.

- 홈 헤더 진실의 원천 전환: 매물 1건 이상이면 헤더 업종·지역을 매물에서 파생(업종=biz_type 통과, 지역=주소 시/도 축약 — lib/regions.ts sidoFromAddress, 정식명/축약형 양쪽 대응). 0건·example만 있으면 온보딩값 유지. 온보딩 원본은 프로필에 보존(표시만 분기). Playwright 188개.

### 다음 할 일
- **업종 분류 통일 1단계 완료** (구현 순서 1~7 전부). SQL 백필 실행 완료 — franchise_brands 11,683/11,683 매핑, listings 7건 백필. categories.ts에 안경점·약국 신설. E1 업종 입력을 A3와 같은 2단계 드릴다운+동의어 검색으로 교체(components/IndustryPicker.jsx — A3·E1 단일 구현). 프랜차이즈 브랜드 선택 시 3필드 자동 승계. 조용히 깨져 있던 3곳 정정: 탐색 '같은 업종'(대분류 기준), 시설 추천(소분류→대분류→biz_type 폴백 resolver), 뉴스 매칭(수집 키를 대분류 8종으로 — 옛 12종 고아 행 자동 정리). 홈 헤더·E2 상세 "대분류 > 소분류" 표기. 완성도에 업종 5점 편입(필수 아님). biz_type 컬럼은 병행 유지. Playwright 202개.
  - 6단계 재질문 플로우 완료 — components/IndustrySubPrompt.jsx. 대상(category_main 있고 category_sub 없음) 매물 소유자가 홈 진입 시 1회 노출, 칩 선택 즉시 저장(소유권 device_id 조건 포함), 닫기는 sessionStorage라 다음 접속에 재노출. example 매물도 대상에 포함(현재 대상 6건이 전부 example이라 제외하면 아무도 안 뜸). Playwright 209개.
  - 재질문 진행률 확인: `SELECT category_sub IS NOT NULL AS 응답완료, COUNT(*) FROM listings WHERE category_main IS NOT NULL AND biz_type IN ('카페·디저트','치킨·피자','중식·일식·양식','주점·바','미용·뷰티','헬스·스포츠','편의점·마트') GROUP BY 1;`
  - **더미 매물 정리 완료 (2026-07-20)**: listings 80건 → **13건**. 개발 중 예시 채움 더미 67건 삭제(상호 '서교동 고양이 카페' + DEMO_DATA 주소 66건, 스모크 테스트 1건). 삭제 전 대화(DM) 연결 0건 확인 후 실행 — DM 유실 없음. 재질문 대상은 0건이 됐고, IndustrySubPrompt는 향후 유입분 안전망으로 남는다.
  - 남은 13건: 실매물 10건(우리집2·점포라인2·룩스필라테스·치킨팩토리·왓더버거2·킨크커피·피트니스클라스) + 대표님 판단으로 보존한 3건(더미 상호에 김포 실주소 1, 상호 빈칸 hidden 2).
  - 후속 정리 후보: ①고아 대화 1건(`conversations.listing_id`가 삭제된 매물을 가리킴) ②남은 13건 중 **10건이 biz_type NULL** — 실사용자 매물 대부분이 업종 미입력이라, 완성도 5점 편입만으로 채워지는지 관찰 필요
- 협의중(negotiating) status 도입 + 진행 가이드 재구성 + 데이터 정리 (ORDER-guide-status-cleanup A~D 완료). SQL 실행 완료 — listings.status에 **CHECK 제약 신설**(5종. 이전엔 제약이 아예 없어 오타 값이 그대로 저장됐다), probe 행·고아 대화 정리(고아 0건 확인). 전환 규칙 published↔negotiating↔completed, hidden 현행 유지, completed 종착. 협의중은 탐색에 계속 노출 + "협의 중" 뱃지 + 문의 가능(E2 방문자 접근 허용). 홈 카드·더보기 시트 연동.
  - 진행 가이드 6단계 전면 재구성 — 전부 DB 판정: 매물 등록 / 내부 사진 3장 / 소개글 다듬기(review_choices) / 매물 공개(published·negotiating) / 첫 문의 받기(수신 대화 ≥1) / 가격 협의 시작(status=negotiating 또는 내 답장 발신). 판정 불가였던 계약서·잔금 단계 삭제(done:false 하드코딩이라 영원히 미완료인 장식이었음). 5~6은 CTA 대신 "기다리는 중" 표시, 전 단계 완료 시 접힘 + "협의 진행 중" 요약.
  - 업종 재질문 확장: 업종이 아예 없는 매물(신·구 컬럼 모두 NULL)은 IndustryPicker 재사용해 대분류부터 질문 → 3필드 + biz_type 저장. 현재 대상 10건.
  - Playwright 240개.
- E2 매물 상세 소유자 모드: 본인 매물(device_id 일치)이면 상단 안내 바("내 매물이에요 · 방문자에게 이렇게 보여요") + 하단 액션을 관리용으로 교체 — 문의하기·찜 제거, "매물 수정하기"(?edit=) + 상태 전환(숨기기/공개전환/거래완료, A7 더보기 시트와 같은 규칙·확인 모달). 본문은 방문자와 동일(공개 모습 확인 목적). 거래완료 매물은 수정·전환 모두 차단. 방문자 화면 무변경. Playwright 221개.
- 홈 카드 phase 2 후보: 가게 지표·문의 알림 섹션을 내 매물 카드로 흡수 (v1에서는 현행 위치 유지 — 구현 금지였음)
- 내 매물 2건 이상 가로 스와이프 (v1 범위 밖 — 현재는 세로 리스트)
- D4 통합 인박스 설계·구현 (/messages 단일 화면 + [문의]/[업체 제안] 필터 딥링크 — 라우트 생기면 더보기 항목 자동 노출, 별도 세션)
- 폐업 감지 실동작 관찰: 사업자번호가 저장된 published 매물이 쌓이면 첫 크론(월 05시)에서 checked>0 확인. 현재는 대상 0건이라 checked:0 정상.
- A3 나머지 역할(소유주·창업자·사장님·기업회원)에 업종/지역 드릴다운 확장
- 온보딩 답변 개인화 (A7 인사말·시세 유도)
- 보안 부채(정식 RLS): ①폐업 배치 anon→service role 분리 ②business_number 컬럼/뷰 레벨 차단 (미해결 이슈 참조)
- 출시 전: OAuth 키 환경변수 이전, 네이버 검수 신청

### 프리미엄 출시 시 복귀 지점 (2026-07-20 카피 제거)
> 상품이 설계 전인데 혜택·가격을 광고 중이라 전부 걷어냈다. 출시 때 이 자리로 돌아온다.
> **설계 시 금지: "노출 1층/2층/3층" 같은 층수 비유** — 부동산 도메인에서 실제 점포 층수로 오독된다.
- `e1/E1Step5.jsx` 체크리스트 아래 — "무료 노출(1층)" 안내 박스 (이번 오더의 직접 대상)
- `e1/E1Step2.jsx` 초안 생성 로딩 화면 — 무료/프리미엄 대비 박스
- `e1p/E1pStep2.jsx` 같은 위치 — 임대인용 동일 박스
- `MyPage.jsx` 플랜 카드 — 혜택 문구 + "프리미엄으로 업그레이드" 버튼 (현재 플랜 '무료' 표시는 사실이라 유지)
- `MyDetailPage.jsx` MembershipContent — 혜택 5줄 + "월 9,900원" 결제 버튼 → "준비 중" 안내로 대체
- `A7StartupFeed.jsx` — "추천의 질이 더 높아져요" 혜택 박스 + "프리미엄 추천 받기" CTA
- `A7BusinessDashboard.jsx` — 잠금 항목 라벨에서 "(프리미엄)" 표기 제거
- 회귀 방지: `tests/no-premium-copy.spec.js` (화면별 프리미엄 문구 0건 고정)
- 남겨둔 것: `FAuthGate.jsx`의 `premium` 인증 사유(결제 흐름 복귀 시 필요), `lib/memberTier.js` 등급 훅

### 미해결 이슈
- 카드 컴포넌트(VideoCard 등 7종) React "key prop spread" 경고 — 기능 영향 없음
- D4BusinessChat 더미 보존 상태 (매칭 성사 B2B UI — 실연결 채팅에 얹기 예정)
- RLS 울타리 수준 (DELETE 차단만) — 정식 RLS는 로그인 데이터 귀속 완료 후
  - **폐업 배치가 anon 키로 남의 매물 status를 변경**한다 (api/check-business-closure). 지금은 동작하나 "아무나 status 변경 가능"이라는 부채. 정식 RLS 도입 시 배치를 **service role 키로 분리** 필요.
  - **business_number 비공개** — 앱은 방문자 쿼리(ExplorePage 명시 컬럼·E2 fetch 후 strip)에서 뺐지만, anon 키로 직접 조회하면 여전히 읽힌다. 네트워크 레벨 차단은 정식 RLS(컬럼/뷰) 몫.
- Gemini 6개 함수 일시 중지 (⏸ 입력이 더미 수치 — 실데이터 연동 시 재개)

---

## contract-app — 점포라인 이너 업무 앱 (계약서 전자서명)

> 위치: `contract-app/` (이 저장소에서 gitignore — 별도 추적)
> 용도: 광고계약서 iPad 수령 — PIN 잠금, 작성→고객 확인·서명→PDF 저장·공유, 인트라넷 중계 모드.

### 현재 상태
- 이 저장소에 진행 이력 미기록 — 다음 contract-app 작업 세션에서 실측 후 채울 것. (추측으로 채우지 않는다)

### 다음 할 일
- (미기록 — 다음 작업 시 작성)

### 미해결 이슈
- (미기록 — 다음 작업 시 작성)
