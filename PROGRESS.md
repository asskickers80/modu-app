# PROGRESS.md — 프로젝트별 현재 진행 상태

> /조각 완료(커밋)마다, 그리고 세션 마감마다 갱신한다.
> 상세 이력은 docs/STATUS.md — 이 파일은 "지금 어디까지 왔고 다음이 뭔지"의 스냅샷만.

---

## 모두 (modu) — 리테일 생태계 슈퍼앱

### 현재 상태 (2026-07-24)
- Playwright 375개 전체 통과.
- **임대인 홈 헤더 집계 + 상가 카드 제목 (ORDER-landlord-home-header-card-v1)** — **헤더**: "상가 N개"(occupancy 기반)→**deal_type 집계** "임대 N · 매매 N 진행 중". both는 임대·매매 양쪽 각각 +1(임대2·매매1+both1→"임대 3 · 매매 2"), 한쪽 0이면 생략("임대 N개 진행 중"). 사용자 표기 "매매"(매각은 내부, E1p 선택지 통일은 범위 밖). **지역**: 실상가 sidoFromAddress 집계 승격, 여러 시도면 "서울 외 N곳" 축약, 없으면 A3 폴백. **카드 제목**: "(상호 없음)" 제거(상가는 상호 개념 없음) → 행정동/도로명 이하 마지막 단위+번지("강일동 676-1"), address_detail 호수 패턴 있으면 괄호 병기("… (301호)"), 애매하면 생략. ListingCardRow에 `title` prop 추가(seller는 displayShopName 유지). 서브라인은 deal 표기+금액(주소 중복 제거). Playwright 375개(집계 조합 임대/매매/혼합/both·지역 승격·다지역 축약·카드 제목 호수 유무 신규 8). **both 합산 판정 근거**: both를 양쪽에 +1 = "임대로도 매매로도 진행 중"을 각 카운트가 정직 반영 + 한쪽만 보는 사용자에게도 노출(대안 '임대매매 별도 표기'보다 직관적).
- **미구현 기능 (예정) 표기 — 삭제 금지 (ORDER-planned-label-v1)** — 장래 예정이나 미구현인 연출·표시를 삭제하지 않고 "(예정)" 부착으로 정직화(전체 틀 보존). **E1p Step2 로딩 체크리스트**: 실호출 없는 3단계(위치·상권 수집/등기·건축물 분석/인근 임대 시세 비교)에 (예정) + **완료 체크(✓) 제거**(planned 플래그, 안 한 일에 완료 표시 모순 해소). 실호출 단계(설명문 초안=Gemini)는 표기 없이 유지. 로딩 부제도 "분석하고 있어요"→"초안 쓰는 중(분석은 예정)"으로 정직화. **E1 Step2**는 실 spinner+실 Gemini/marketData뿐이라 (예정) 대상 없음(전수 확인). **기존 (미구현) 전부 (예정)로 통일**(등기부 4곳·건축물대장 2곳). **전 축 grep 추가 발견**: E1pStep1 부제 "주소만 넣으면 자동으로 채워져요"(실 Daum+수동 입력이라 자동채움 없음)·E1Step4 "POS·카드단말기 연동"(실시간 자동 동기화 미구현)에 (예정). MyDetailPage 실험실은 이미 "베타 기능"으로 정직 프레이밍이라 그대로. Playwright 367개((예정) 표기·✓ 부재·미구현 소멸 신규 2).
- **임대인 콘텐츠 블록 일괄 — 뉴스+필독+한 마디 (ORDER-landlord-content-v1)** — 홈 골격 통일 때 누락된 콘텐츠 영역을 양도인 동형으로 채움. **① 뉴스**: `market_news`에 부동산 축 버킷 추가(api·scripts 양쪽, biz_type='부동산' 키워드 상가 임대차·매매·공실률·상권 동향·상가 투자) — 의도 가중은 다중버킷 구조 필요라 유보하고 **일괄 노출**로 단순화. 홈이 market_news biz_type='부동산' 조회·렌더(0건 준비중). **② 임대인 필독**: `scripts/generate-daily-contents.js`에 landlord 섹션 추가(genLandlordGuide 5주제: 상가임대차보호법·공실 대응·임차인 심사·매각 절차/세금·권리금 회수기회, 법률/세무는 개요+전문가 확인 안내, 5초 지연+지수 백오프 재사용) → content_type='landlord_guide'. **③ 오늘의 한 마디**: genLandlordCoaching → content_type='landlord_coaching', 홈 ⑥ 준비중→실콘텐츠(ModuMark, AI 라벨 없음). **스키마(a)**: daily_contents CHECK에 landlord_guide·landlord_coaching 추가(`docs/SQL-landlord-content.sql`, 대표 실행 대기). **배치 실행**: Gemini 실호출·실 DB 쓰기는 헌법상 샌드박스 금지 → 코드만 작성, 실행은 대표 인프라(`node scripts/generate-daily-contents.js`). Playwright 365개(콘텐츠 렌더+0건 폴백 신규 2). **대표 실행 대기: SQL-landlord-content.sql → 배치 실행**.
- **매각 상가 수익률 필수화 — 임차 현황 분기 (ORDER-e1p-yield-required-v1)** — 매각(sale·both)은 수익률 필수. E1pStep1에 "현재 임차인이 있나요?" 칩 [있어요=occupied/공실이에요=vacant] 신설(occupancy 저장). occupied→현 보증금/월세 실계약 기준, vacant→예상 보증금/월세. 수익률 **자동 계산**(`lib/format.computeCapRate` = 연 월세×12÷매매가×100, 소수1자리), 라벨 실계약 "수익률"/공실 "예상 수익률"로 구분(E1p·E2L 모두 — 매수자 실/예상 오인 금지). **필수 검증**: 매각·둘다는 매매가+보증금+월세+임차현황 없이 다음 차단(canNext). **임대 단독은 선택**(질문은 노출—공실 여부 기록, 필수화 이득 낮아 자율 판정으로 비필수). **스키마**: `occupancy` 컬럼 1개만 신설(SQL `docs/SQL-occupancy.sql`, 대표 실행 대기 a) — 현/예상 보증금·월세·수익률은 deposit/monthly_rent/cap_rate 재사용(occupancy로 현/예상 구분). saveListing에 occupancy 컬럼 미생성 폴백(배포가 SQL 앞서도 저장 유지). **홈 헤더 공실 복원**: occupancy 저장 생겨 "상가 N개 · 공실 N · 임대 중 N · 매각 N"(0 생략, 과밀 방지)로 승격. E1p 수정 로드 역매핑에 occupancy 반영. Playwright 363개(필수차단·자동계산·라벨·payload·E2L 라벨 신규 7). **대표 실행 대기: `docs/SQL-occupancy.sql`**.
- **등기부·건축물대장 (미구현) 표기 + E1p 수정 모드 (ORDER-e1p-fix-bundle-v1)** — **1부**: 등기부등본 "자동열람 완료" 기만 문구 4곳(E1pStep4 카드 제목·안내, E1pStep5 체크리스트·리스트)에 "(미구현)" 표기, 건축물대장 준비중 안내 2곳(E1pStep1·E1Step1)도 "(미구현)" 명시. 레이아웃·체크아이콘 무변경(표기만). **2부 E1p 수정 모드**: 그동안 E2L "상가 수정하기"가 `/e1p/1?edit=`로 보냈지만 E1pContext가 edit를 안 읽어 빈 폼+신규 INSERT였던 것을 실동작화. `lib/listings.loadListingForEdit`(조회+소유권 user_id 우선 검증) 신설 — **E1Context도 이 공용 로더로 통일**(복제 제거). `lib/completeness.listingToLandlordContext`(row→E1p data 역매핑, deal_type 역변환·주소 base/detail 분리·예시 status 유지) 신설. E1pContext에 editId 로드 useEffect + editingListingId + editLoading. E1pStep5가 editingListingId를 saveListing에 넘겨 **UPDATE(신규 INSERT 금지)**. E1pStep2는 수정 시 저장된 초안 있으면 Gemini 재호출 안 함(편집 보존+호출 절감). 비소유자 수정 URL은 E2L로 차단. Playwright 356개(E1p 수정 로드·비소유자 차단·UPDATE·미구현 표기 신규 4).
- **주소 입력 전수 실구현 (ORDER-address-real-everywhere-v1)** — 전수 조사 결과 공용 Daum 컴포넌트 `components/AddressSearch.AddressSearchModal`이 이미 존재(양도인 E1 사용)했고, **실주소 필요(가) 더미는 E1pStep1 단 하나**였다(목 주소 3건 하드코딩 `MOCK_ADDR` + `selectAddr` setTimeout 가짜 자동채움 floor'1층'/area'45' + 죽은 검색·지도 버튼). E1p를 양도인 E1과 동일하게 실 `AddressSearchModal`로 교체 — 주소 검색 버튼→바텀시트 Daum, 상세주소 입력 신설(E1pContext `detailAddress`), 저장은 `address=[address,detailAddress].join`+`address_detail`(E1 동일 정책). 가짜 자동채움·목 드롭다운·"건축물대장 자동 확인 완료"·지도 버튼 전부 사망, "건축물대장 준비중" 안내로 대체(가짜 자동채움 금지). E1p "지도" 탭=장식 죽은 버튼이라 제거. (나) 지역 칩 지점(A3 5축·탐색 필터)은 regions.ts/searchRegion 기반 실동작이라 유지(더미 아님). 복제 없음 — Daum 로직은 AddressSearchModal 단일 소스. Playwright 352개(E1p 실 검색 버튼 노출+더미 사망, 상세주소 분리 저장 신규).
- **임대인 홈 의도 개인화 — A3 답변 기준 (ORDER-landlord-intent-align-v1)** — [공통] 원칙: A3 답변=홈 개인화 진실의 원천, 실등록 객체 생기면 객체(deal_type) 승격. 임대/매각은 사람 속성이 아니라 상가별 상태 → 홈 어휘는 답변/실상가 추종, 상가별 구분은 카드 뱃지. `lib/guideSteps.landlordIntent(activeListings, profile.status)` 신설 — 실 deal_type 집계 우선, 없으면 A3 `profile.status`. **값 매핑 주의**: A3 `vacant`/`sale`/`both` · listing `lease`/`sale`/`both` · intent `rent`/`sale`/`both`(3중 불일치 정규화). **헤더**: 0건은 의도별("서울 상가 임차인 찾는 중"/"매각 준비 중"/"임대·매매 준비 중"/의도미상 "상가 관리 중"), 등록 후 "상가 N개 · 임대 N · 매각 N"(1개 단수·both는 "임대·매매"). **가이드**: 제목 "🗺️ 상가 진행 가이드" 고정, 문의받기 어휘만 의도추종(임차/매수/문의). **완성도**: "내 상가 정보 완성도"(중립 고정). **빈 CTA**: 의도별("임차인 찾기"/"매수자 찾기"/"등록하기"). **finishLogin 신규 가입 분기**: onboardingAnswers(status·region) 병합 → 신규 가입자도 profile.status 영속(카카오 왕복 생존). **전수 감사 중립화**: A7 "임대 진행 가이드"→"상가 진행 가이드", "임대 현황"→"상가 현황", 인박스 "임차 문의"→"문의"(3곳), E2L "임대인 매물/DM/폴백"→"소유주"(5곳). E1p `임대 조건`류는 isRent 조건부라 유지(OK). Playwright 350개(의도 3종×등록 전후 매트릭스 5 신규).
- **임대인 홈 골격 통일 — 양도인 기준 (ORDER-landlord-home-align-v1)** — 임대인 홈이 전부 ComingSoon+하드코딩 가이드였던 것을 양도인 홈의 검증된 7섹션 골격으로 재작성: ①인사+헤더(실등록 상가 파생) ②내 상가 카드 ③진행 가이드 ④임대 현황(준비중) ⑤지표·문의 ⑥오늘의 한 마디(준비중) ⑦완성도(준비중). **공유 컴포넌트 추출(복제 금지)**: `components/ListingCardRow`(카드 행, 색·메타·목적지 파라미터화 — MyListingCard도 이걸 사용), `components/ProgressGuide`(가이드 렌더), `components/MetricsPanel`(지표·문의 타일, UnreadDot·펄스 공유), `lib/guideSteps`(buildGuideSteps 양도인 이관 + buildLandlordGuideSteps). 양도인 홈은 인라인 가이드·지표를 이 컴포넌트로 재배선(동작 동일, 57개 홈 테스트 통과). **임대인 실조회 신설**: listings(device_id+listing_type='landlord') + 대화/메시지로 문의 신호. 내 상가 카드 0/1/3/5(4개째 "외 N개" 접힘). **가이드 단계 판정 근거**: 등록→소개글 다듬기→공개→문의받기→협의시작(5). '사진'은 임대인 저장이 image_urls를 비워 저장(영원히 미완료 장식)이라 관찰 가능 원칙에 따라 제외, 대신 관찰 가능한 소개글(review_choices)로 대체. 매각(sale) 병행도 문의·협의 동일축(deal_type 무관). 헤더 종합은 실데이터인 총상가·임대·매각만(점유 상태 '공실/임대중'은 소스 없어 더미 대신 제외). 완성도는 calcScoreLandlord 스텁(배점 미확정) + 준비중. 오늘의 한 마디는 임대인 코칭 배치 없어 준비중(배치 확장 필요). Playwright 345개(임대인 홈 0/1/3/5·가이드 점등·문의 지표 신규 6, coming-soon/more-sheet 갱신).
- **landlord-persist-v1 잔여 항목 3 완결 — 임대인 예시 상가 (2·4는 진단상 이미 완료)** — 조사(項2 E1p저장·項4 DM 전부 구현·테스트 확인, 유일 누락=예시 상가 시드). 양도인 E1과 동형으로 임대인에 isDemo 연결: `E1pContext`에 `isDemo:false` 신설, `E1pStep1.fillDemo`가 `isDemo:true`(예시✦→status='example'), 실주소 선택 시 `isDemo:false` 해제, `E1pStep5`가 `isDemo:data.isDemo`로 저장. 별도 시드 SQL 불필요 — 예시✦ 채움이 곧 example 매물 생성(seller와 같은 UX). 사업자번호 게이트는 E1p 경로에 코드 자체가 없어 비적용(휴대폰 본인인증 더미만 사용) — 근거 확인. Playwright 339개(E1p 예시✦ 전체 플로우→status='example' 신규).
- **landlord-persist 소유권 user_id 우선 정합 (landlord-persist-v1 후속)** — 스키마 SQL(listing_type + 임대인 필드) 대표 실행 완료(null_type=0 확인), §3 `listings.user_id`와 정합. `lib/listings.saveListing`이 생성(INSERT) 시점에 로그인 사용자 id를 `user_id`로 스탬프(`getSession()` 로컬 기반, 비로그인은 null→device 폴백) → `isOwnerOf`가 seller·landlord 모두 **처음부터 user_id 우선** 판정. `docs/SQL-landlord-persist.sql`을 user_id 정합으로 갱신(재생성 금지·존재확인 읽기·소유권 매핑 user_id 우선). Playwright 338개(landlord 저장 테스트에 세션 시드 + `user_id='test-user'` 스탬프 단언 추가).
- **카카오 로그인 경로 병합 소실 수정 (identity-model 후속)** — 실기기 재현: A2 임대인 선택 → 카카오 로그인 → seller만 남음. 추적 결과 콜백은 finishLogin을 경유(IDENTITY-MODEL 위반 아님)하나, 카카오 authorize URL에 **`state`가 없어** 병합 정보(pending_roles·onboarding·intent)를 **origin/컨텍스트 종속 localStorage로만** 날랐다. 실기기 카카오 왕복은 인앱 브라우저/다른 컨텍스트/캐노니컬-오리진 복귀로 떨어져 그 localStorage가 승계되지 않음 → 선택 역할 통째 유실. 특히 로그인 지름길 경로는 `modu_pending_roles`가 유일 운반체라 전멸. **수정**: A4 `handleKakaoLogin`이 {역할·카테고리·의도·온보딩답변}을 OAuth `state`(base64)에 실어 보내고, 콜백 `rehydrateFromState`가 intent/pending 읽기 전에 복원. **정직 보고**: 기존 카카오 콜백 병합 테스트는 `addInitScript`로 pending_roles를 매 로드 재주입(같은 오리진)해 컨텍스트 소실을 전혀 재현 못 했음 → localStorage 없이 state만으로 병합되는 신규 테스트 추가, rehydrate 제거 시 실패(seller만)·적용 시 통과 확인. Playwright 338개.
- **신원 모델 확립 + 판정 통일 + 부채 상환 (ORDER-identity-model-v1)** — 기준 설계 문서 `docs/IDENTITY-MODEL.md` 신설(3층: 기기 device_id=비로그인 임시 / 계정 auth.users=영구 / 프로필 profile_data.roles=역할 배열, 활성=로컬 · 전이 5규칙 · 사람=계정 1개). **행동 게이트 판정 통일**: E2/E2L 문의 게이트를 `!user && (!cat||browsing)`(역할 신호 혼재)에서 **`!user` 단독**으로 이관 — 로그인=계정 있음, 비로그인이면 역할 무관 가입 유도. **찜도 동일 게이트**(찜 전용 문구·returnTo 보존, 로그인이면 토글 aria-pressed). **mergeDeviceData 부채 상환**: 6개 UPDATE를 `Promise.all`+`catch{}`(삼킴)에서 연산별 1회 재시도+실패 로깅으로 교체(messages.sender_id 실패를 더는 조용히 버리지 않음). **ownership.js user_id 우선**: `isOwnerOf(listing, userId)` — 계정 소유(listings.user_id==로그인 id) 1순위, device_id 폴백(하위호환: userId 미전달·컬럼 없으면 기존 동작). E2/E2L 조회 가드·렌더·fetch deps 일관 전달. 테스트: 문의 흐름 5개 스펙에 공유 `seedSession`(helpers.js) 도입해 "로그인 문의자"로 표현(게이트 통과), 찜 게이트·user_id 소유 판정 신규. **대표 실행 대기 SQL** `docs/SQL-identity-model.sql`: ①김태우 중복계정 통합(B 이메일계정 데이터 0 → 삭제, b) ②고아 sender_id 진단(b) ③listings.user_id 컬럼(a). `docs/LOGIN-DEBT.md` 상환 표시+잔여 착수조건 갱신. **수렴 키 근거**: 카카오 콜백(`api/kakao-auth.js:58`)이 `kakao_account.profile.nickname`만 읽고 실이메일(`kakao_account.email`) 미수집 → 내부 합성 이메일로 계정 분리. 통합 키 후보=카카오 실이메일 수집 후 기존 이메일 계정 대조 연결. Playwright 337개.
- **새 문의 타일 시각 강화 (ORDER-inquiry-alert-v2)** — 새 문의(미확인) 수를 타일 내 최대 요소로(18→30px font-black, 다른 타일보다 큼). 미확인>0이면 네이비 대신 **경고 레드(#ef4444, "새 활동=빨간 배지" 원칙·메시지 탭 점과 동일 색)** + 우상단 빨간 점 뱃지 + 소프트 펄스 3회 후 정지(무한 깜빡임 금지, prefers-reduced-motion 가드). 0이면 전부 해제. 빨간 점은 `components/UnreadDot.jsx`로 추출해 MessageTabDot·문의 타일이 **단일 컴포넌트 재사용**(복제 제거). 색은 9색 토큰에 별도 경고 토큰이 없으나 #ef4444가 앱의 정식 알림 레드(메시지 점·오류·하트)라 STOP 없이 채택. Playwright 320개(뱃지 표시/해제 검증 추가, 펄스는 스냅샷 제외).
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
