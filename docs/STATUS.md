# 모두(Modu) — 개발 현황 STATUS.md

> 최종 업데이트: 2026-07-05 (정직화 마감 — /business/* 정리·폴백 정직화. 내일 고객 시뮬레이션)  
> 빌드: ✅ dev 서버 0 에러  
> 테스트: Playwright **124개** — 전체 PASS, 외부 API 의존 0 (실환경은 scripts/smoke 일회성 스모크로 별도 검증)

---

## 오늘 완료 (2026-07-05 — 정직화 마감 + 시뮬 준비)

| 항목 | 파일/커밋 | 내용 |
|------|------|------|
| /business/* 4개 정리 | (6a1be71, −408줄) | competitor·trend 순수 더미 삭제(**라우트 39→37**), performance 준비중 전환+**Gemini 성과해석 마지막 사용처 제거(⏸ 6개째** — 입력 100% 더미 실증), push는 3단계 폼 UX 보존+가짜 인원수·가짜 "발신 완료" 화면 제거(발신 시 준비중 토스트) |
| 창업피드 폴백 정직화 | `A7StartupFeed.jsx` (0446eb0) | Gemini 실패 폴백의 가짜 수치 주장("가맹 문의 32% 증가"·"신규 매물 12건" 등) 제거 → "트렌드 분석을 불러오지 못했어요" 정직 폴백 (카드 프레임 유지) |
| 로컬 설정 언트래킹 | `.gitignore` (e58e145) | `.claude/settings.local.json`(개인 권한 설정) git rm --cached + gitignore — 개인 설정 커밋 유입 차단 |
| **"가짜 숫자" 전선 최종 상태** | — | **핵심 동선(대시보드 6종·E1·E2·D4·탐색·커뮤니티 Q&A·마이) 0건.** 잔존 3건 전부 사유 기록: ①E2L 더미 상세 = 임대인 축 결정 대기(LANDLORD-PLAN) ②추천피드 더미 글 = 유지 합의 영역 ③D4BusinessChat = 매칭성사 UI 보존 지시 |

## 이전 완료 (2026-07-04 — 시연일 정리 + 무인 연속 세션)

| 항목 | 파일/커밋 | 내용 |
|------|------|------|
| E1/5 사진 판정 버그 + 건축물대장 더미 제거 | `E1Step5.jsx`, `E1Step1.jsx` (761f130) | 원인 ③: CHECKLIST가 done 하드코딩 상수(판정 로직 부재) → buildChecklist(data) 실판정(9행 전부). 주소 선택 시 B1/33㎡ 가짜 자동채움·"자동 확인 완료"·'자동' 배지 삭제 → "자동조회 준비중" 안내. 코워크 매물 92% 불변 확인 |
| picture/ gitignore | (3932462) | 코워크 로컬 자산 폴더 커밋 유입 차단 |
| 늦은 잔재 2건 숨김 | (9d7e0f3) | 2d53f1c3·646112c9 — published 5건(우리집×2·대표님 고양이×2·룩스필라테스), 원복 로그 62건 |
| A7 임대인 → ComingSoon | `A7LandlordDashboard.jsx` (84bbb2b, −273줄) | 자산·통계·문의건수·자산별·시장동향·업체·필독 전환 + **가짜 수치 입력 Gemini 2종(임대인 코칭·시세해석) 호출 제거**(고정 문구/준비중). 인박스·탭 배지 실기능 무변경 |
| 죽은 더미 페이지 7개 삭제 | `App.jsx` 외 (5e0acb0, −1,052줄) | /seller/×5·/e3·/community/room 파일+라우트 삭제, catch-all(`*`→홈) 신설, A7운영중 참조 4곳 토스트 전환, DevMenu 죽은 링크 8개 제거 |
| 예시✦ status='example' | `E1Context/Step1/Step5.jsx`, `A7SellerDashboard.jsx` (b8884b3) | 예시 채움 제출은 example로 저장(마켓 미노출 — published 필터 자동 제외). 상호·주소 실입력 시 자동 해제→published. A7 '예시' 배지, 상태 액션 미표시. CHECK 제약 없음 가역 프로브 실증 |
| E2 example 배너 문구 | `E2PropertyDetail.jsx` (b4bdf3d) | 주인 시점 "숨김 상태예요" → "✦ 예시 매물이에요 — 실제 등록하려면 …" 정확화 |
| A7 운영중 → ComingSoon | `A7OperatingDashboard.jsx` (a04c779, −407줄) | 세 번째 동일 패턴: 매출/주간차트·통계·할일·프로필완성도·시장동향·업체·콘텐츠·가이드 8슬롯 전환 + **가짜 수치 입력 Gemini 2종(운영 코칭·진단) 호출 제거**. 매출 입력 버튼(실기능)·인박스·탭 배지 무변경 |
| A7 기업회원 → ComingSoon | `A7BusinessDashboard.jsx` (3b51009, −401줄) | 네 번째: 더미 DM/AI추천(BIZ_DEMANDS)·성과 4칸·놓친수요·노출페이지 완성도·동종비교·업계동향·노출팁·헤더 요약 전환 + **가짜 수치 입력 Gemini 2종(기업 코칭·성과해석) 호출 제거**. 인박스·Push영업·E1b 진입·무료 플랜 카드(사실) 무변경. D4BusinessChat 무접촉 |
| A7 그냥구경 정직화 (판형 유지) | `A7BrowsingFeed.jsx` (2dd37eb) | ⚠️ 다른 접근 — 매거진 콘셉트 보존: 수치성 더미(조회수·공감·통계·인원·매물 수치·LIVE) 전부 제거, 카드 7종의 배지·이미지영역·판형은 유지하고 제목/본문을 "콘텐츠 준비중" 정직 카피로. generateBrowsingCopy(개인화 없는 트렌드)·가입 유도 CTA 유지 |
| **🏁 마일스톤: 6개 대시보드 더미 정리 완료** | 양도자 2f2c779 · 임대인 84bbb2b · 운영중 a04c779 · 기업회원 3b51009 · 그냥구경 2dd37eb (+창업준비 피드는 애초 실데이터) | 전 카테고리 A7에서 가짜 숫자 0 — 실데이터 or "서비스 준비중"만 표시 |

## 이전 완료 (2026-07-04 새벽 — 데모 준비 세션)

| 항목 | 파일/커밋 | 내용 |
|------|------|------|
| MyPage 정직한 빈 상태 + 읽음 1요청 | `MyPage.jsx`, `lib/unread.js`, `D4Chat.jsx` (3cf33fc) | 계정정보 연락처·사업자·소셜 더미 → '미등록/미연동'+준비중 토스트, 헤더 더미 전화 제거. markConversationSeen에 sender_id 전달+캐시 → 열람 GET 제거(PATCH 1회) |
| 투자자 데모 동선 E2E | `tests/demo-flow.spec.js` (85f1921) | 5막 연속 시나리오(온보딩→E2 신뢰신호→DM→양도자 A7 왕복→커뮤니티) + 막마다 콘솔 에러 0건 단언 |
| 양도자 기능 전수 체크리스트 | `docs/SELLER-CHECKLIST.md` (7ef5ba7, 4e03305) | 코드 기준 217항목(수동 3 포함). 실환경 스모크로 ⚠️ 51→34 (Gemini 8·Storage 3·국토부 2·DB UPDATE 4 검증) |
| 더미 수치 → "서비스 준비중" | `components/common/ComingSoon.jsx`, `A7SellerDashboard.jsx`, `MyDetailPage.jsx`, `CommunityPage.jsx` (2f2c779) | A7 매출/통계/새문의/시장동향/거래처/필독, 마이 하위 7섹션, 오픈채팅 탭 — 더미 상수 삭제(MARKET_CARDS·BIZ_CARDS·ARTICLES·ROOMS·SimpleForm), 카드 프레임 유지 |
| 완료 배지 모순 제거 | `MyPage.jsx` (64451b3) | '본인인증 완료'·'인증완료'·'완료' 가짜 배지 3곳 제거 (상세가 준비중인데 본체가 완료 주장하던 모순) |
| 실환경 스모크 | `scripts/smoke/demo-smoke.mjs` (4e03305) | Gemini 3회(초안 JSON OK·코칭·시세해석)·Storage 업/삭제·국토부 resultCode 000 실증. **RLS 미차단 실증**: anon으로 타 device_id 매물 UPDATE 1행 성공(no-op) — 로그인 도입 시 해결 |
| 테스트 잔재 정리 | `scripts/smoke/hide-test-listings.mjs`, `hidden-listings-20260704.json` (4f387a1, 30a8d30) | published 64→**4건** (숨김 60건 로그·원복 가능, 삭제 0). 잔여 = 우리집×2 + 대표님 소유 고양이카페×2. 빈 매물 2건은 7/1 구코드(가드·device_id 도입 전) 생성 확정 — 현재 코드로 재발 불가 |
| updated_at 추적성 | `A7SellerDashboard.jsx:194`, `E1Step5.jsx:208`, 숨김 스크립트 (02c4fd3) | listings update 전 지점에 updated_at 동시 갱신 (이번 조사에서 변경 시각 추적 불가 문제 해소) |
| 매물 상태 이상 조사 종결 | (조사만 — 코드 무변경) | "[검증용]" 매물 실종 = 삭제 아님·status hidden, 활성 주체는 어젯밤 대표님 세션 산출로 확인 — RLS 뚫림 아님. 빈 매물 2건은 7/1 구코드 생성 확정 |
| NOT NULL 제약 SQL | 대표님 콘솔 실행 | device_id NULL 11건 사전 정리 + shop_name/device_id NOT NULL — SQL 제시 완료, **콘솔 실행 완료 여부는 대표님 확인 필요** |

## 내일 (시연일) — 대표님 수동 체크

1. Daum 우편번호 팝업 2곳(E1/1 주소 검색·자동채움 배지) + E1/4 사진 업로드 → E2 표시 확인
2. 대표님 소유 고양이카페 2건(f5da6630·2340da01)을 A7 더보기 → 매물 숨기기로 정리 (숨기기 기능 체크 겸용)
3. 시연 매물 등록: 80%+ ×2 / 사진 없이 65% ×1 / 타지역 1~2건
4. 커뮤니티 질문 2~3개 등록
5. D4 연락처 교환의 "수락"(🧪 더미 버튼)은 시연자가 직접 누름 — 실 상대방 수락 흐름은 미구현

## 이전 완료 (2026-07-04 낮 — 커뮤니티 Q&A 실연결 + 카테고리 가시화 + 잔반)

| 항목 | 파일 | 내용 |
|------|------|------|
| 커뮤니티 Q&A 최소 루프 | `CommunityPage.jsx`, `CommunityPostDetail.jsx` | Q&A 탭 더미 제거 → community_posts 실조회(최신순)·0건 안내, 질문 등록 실동작(제목·내용 → insert: author_device_id/닉네임/category), 상세 실조회+댓글 목록·등록 실동작, 없는 id는 "글을 찾을 수 없어요". **추천 피드·오픈채팅 탭은 더미 유지**(피드 상세 더미 f1~f5도 보존 — 피드 카드 이동 안 깨지게). 실데이터 카드에서 더미의 답변수·조회수·상태배지 제거(가짜 숫자 금지) |
| 커뮤니티 카테고리 가시화 | `CommunityPage.jsx`, `CommunityPostDetail.jsx` | 글·댓글 작성자에 카테고리 색점+라벨(기존 7색 재활용, null인 옛 글/댓글은 닉네임만). Q&A 탭 상단 필터칩 [전체]+5종 — 그냥구경은 커뮤니티 진입 차단(가입 넛지)이라 제외, 기업회원은 진입 가능해 포함. 댓글 insert에 category 저장(comments.category 컬럼 — 콘솔 추가) |
| 계정정보 이름 실명화 | `MyPage.jsx` | ⑥ 계정 정보 > 이름 행 하드코딩 "홍길동" → `getProfile().name ?? '미설정'`. 연락처·사업자·소셜 행은 여전히 더미(다음 후보) |
| 상대시간 유틸 통합 | `src/lib/time.js`(신설), 인박스 5곳, 커뮤니티 2곳 | 7곳에 바이트 동일하게 복제돼 있던 timeAgo(방금·N분 전)를 lib/time.js 하나로 추출, 포맷 무변경(-70줄). D4Chat timeLabel(절대시각)은 별개라 제외 |

## 이전 완료 (2026-07-03 — 브랜드 확정 반영 + 콘솔 후속 4조각 + 울타리 RLS)

| 항목 | 파일 | 내용 |
|------|------|------|
| 브랜드 최종 반영 | `src/components/ModuMark.jsx`, `src/index.css`, 화면 11곳, `public/favicon.svg`, `index.html` | docs/brand/ 최종 패키지 반영. ModuMark 새 지오메트리(돌기 8개, r23) 교체, Primary Blue #0E6589→**#1683B8**(기존 토큰명 유지·값만 교체, tagline 전용색은 Mint로 흡수), 화면 하드코딩 11곳 일괄 치환, 스플래시 색 갱신, 파비콘 새 심볼+16px 하이라이트 생략, theme-color meta. 카테고리 6색은 무변경(충돌 없음 확인) |
| ModuSpinner 도입 | `src/components/ModuSpinner.jsx`, `E1Step2·4·5.jsx`, `D4Chat.jsx` | 패키지 최종 구현(3D 궤도 회전) 그대로 복사. "행동 후 대기" 4곳에만 적용(AI 초안 대기·사진 업로드·본인인증·대화방 진입) — 목록/카드 자리표시·제3자 브랜드 버튼은 제외 |
| 사진 내/외부 분리 저장·복원 | `E1Step5.jsx`, `lib/completeness.js` | 신규 컬럼 interior/exterior_image_urls에 분리 저장 + image_urls 합본 유지(읽는 쪽 호환). 복원은 새 컬럼 우선, null인 옛 매물은 image_urls→내부 폴백. listingToContext TODO 해소 |
| 주소·상세주소 분리 | `E1Step5.jsx`, `lib/completeness.js` | address_detail 분리 저장 + address 합본 유지(카드·E2 표시, 지역필터·areaCode 파싱 호환). 복원 시 합본에서 상세 접미사 제거해 기본/상세 칸 분리 — 재저장 왕복 안정 |
| receiver_name 실명화 | `E1Step5.jsx`, `E2PropertyDetail.jsx` | 매물 저장 시 owner_nickname 스냅샷(getProfile().name, 수정 재저장 시 자동 갱신) → E2 문의 시 receiver_name=닉네임(없으면 '양도자' 폴백). 인박스·채팅은 기존 폴백 구조라 무수정 |
| 읽음 상태 DB 승격 | `lib/unread.js`, 인박스 5곳 | localStorage 'modu_last_seen' 폐기 → conversations.sender/receiver_last_read_at. 내 역할(device_id 비교)에 따라 내 쪽 컬럼만 update, 판정은 last_message_at > 내 쪽 last_read_at(null=안읽음). markConversationSeen 시그니처 유지(D4Chat·MessageTabDot 무수정). **전환기: 기존 localStorage 값 마이그레이션 안 함 — 최초엔 전부 안읽음으로 뜨고 한 번 열면 해소(정상)** |
| 울타리 RLS (콘솔 — 대표님 작업) | Supabase 콘솔 | 전 테이블 DELETE 차단(앱 코드에 DB delete 0곳 실증 후 적용), profiles는 auth 정석 정책, 커뮤니티 테이블은 dev 정책. 적용 후 전체 84개 회귀 통과. **울타리 수준 — device_id 위조 방어는 없음, 정식 RLS는 로그인 도입 시** |

## 이전 완료 (2026-07-03 밤 — D4 메시지 실연결 루프)

| 항목 | 파일 | 내용 |
|------|------|------|
| D4 문의 실연결 | `src/screens/E2PropertyDetail.jsx`, `src/screens/d4startup/D4StartupInbox.jsx` | receiver_id 'demo_seller' 하드코딩 제거 → 매물 주인 `listing.device_id`. conversations에 `listing_id` 저장, 중복 대화 재사용 판정도 listing_id+sender_id 기준으로 교체. device_id 없는 옛 매물은 "이 매물은 문의할 수 없어요" 처리. 양수자 인박스 더미 제거 → sender_id 실조회+Realtime |
| 창업준비 채팅 더미 삭제 | `App.jsx`, ~~`D4StartupChat.jsx`~~ | 더미 채팅 삭제 → 공용 `/d4/chat/:id`로 통일 (기능 동일, 고유 요소 없음) |
| 임대인·운영중·기업회원 인박스 실연결 | `d4landlord/`, `d4operating/`, `d4business/` | 더미 배열 제거 → device_id 기준 양방향(sender/receiver) 실조회+Realtime, 카테고리 색 유지. 더미 채팅 D4LandlordChat·D4OperatingChat 삭제(공용 통일). **D4BusinessChat은 매칭성사 B2B UI가 있어 보존**. 빈 점포 DM 버튼(E2L·창업피드)은 "준비 중" 토스트로 임시 처리 |
| 시나리오8 플레이크 제거 | `tests/helpers.js` + seller-edge·guards·listing | 실거래가 API 고정 XML mock(`mockMarketData`)을 E1 흐름 테스트 전체에 적용 — 테스트에서 외부 공공 API 의존 제거. 52개 3연속 전체 통과 (시나리오8: 65%/77% 3회 동일) |
| E1 수정 모드 | `A7SellerDashboard.jsx`, `e1/E1Context.jsx`, `E1Step1·2·5.jsx`, `lib/completeness.js` | A7 진입 3곳(등록·수정 CTA/완성도 블록/더보기)이 매물 보유 시 `/e1/1?edit=<id>`. `listingToContext(row)` 역매퍼(19컬럼), 수정 진입 시 draft 폐기(DB가 진실)+소유권(device_id) 검사(실패 시 안내 후 신규 모드), saveListing update/insert 분기, E1Step2 aiDraft 보유 시 재생성 스킵, "매물 수정"/"수정 완료하기" 문구 분기. 테스트 56개 전체 통과 |
| 카드 신뢰 신호 | `lib/completeness.js`(trustBadges), `components/TrustBadges.jsx`, `lib/format.js`, `ExplorePage.jsx`, `A7StartupFeed.jsx` | 완성도 80%+ 매물에만 "✓ 충실한 매물", 검수(review_choices) 있으면 "AI 검수 완료" — 실데이터 기반만, 최대 2개, 낮다고 벌주는 표시 없음. 판정 로직 공용화(카드 레이아웃은 리스트형/카드형 각자 유지), 중복 manwon 포맷 `lib/format.js`로 통합, 창업피드 카드에 보증금 추가 |
| D4 안읽음 표시 | `lib/unread.js`, `components/MessageTabDot.jsx`, 인박스 5곳, `D4Chat.jsx`, A7 대시보드 5곳 | DB에 읽음 필드 없음 → localStorage `modu_last_seen`(대화별 마지막 열람 시각, 기기 한정) 방식. 인박스 안읽은 대화에 점+굵은 미리보기, 스레드 열면 해제, 내가 보낸 메시지는 전송 완료 직후 열람 처리로 제외. 하단 탭 점 배지(MessageTabDot, Realtime 반영)를 대시보드 5곳에 부착 |
| 안읽음 탭 배지 잔여 부착 | `ExplorePage.jsx`, `CommunityPage.jsx`, `MyPage.jsx`, `A7BrowsingFeed.jsx` | 메시지 탭이 있는 나머지 화면 4곳에 MessageTabDot 부착 — 이제 전 화면 커버 |
| 매물 상태 관리 | `A7SellerDashboard.jsx`, `E2PropertyDetail.jsx` | 공개중→숨김→거래완료. A7 더보기에 상태별 액션(숨기기/다시 공개/거래완료—확인 다이얼로그), update는 id+device_id 이중 조건(소유권). A7 카드 상태 배지, 거래완료 매물 수정 진입 3곳 차단. E2 직접 URL: 비공개 매물은 남에겐 not-found, 주인에겐 상태 배너. **A7 내 매물 조회의 published 필터 제거**(주인은 전 상태 관리) |
| E2 상세 신뢰 신호 | `E2PropertyDetail.jsx` | TrustBadges 재사용(제목 아래), AI 설명 캡션 실데이터화("AI 작성 · 양도자 검수 완료" — 검수 기록 있을 때만), "📊 주변 실거래 참고" 접이식 카드(국토부 API 실데이터일 때만, 실패·더미·0건이면 카드 미표시) |
| 하네스 구축 | `CLAUDE.md`, `.claude/commands/진단·조각·마감.md`, `.claude/settings.json` | 작업 헌법(증거 규칙·커밋 규율·범위 판단) + /진단·/조각·/마감 커맨드 + Stop 훅(미커밋 변경 경고, 인코딩 안전형). 커맨드·훅은 다음 세션부터 발동 |
| 제품 원칙 복구 | `docs/PRODUCT-PRINCIPLES.md`, `CLAUDE.md` | 헌법 교체로 밀려난 기존 프로젝트 가이드를 git 히스토리에서 무수정 복원 → CLAUDE.md 상단 `@docs/PRODUCT-PRINCIPLES.md` 임포트로 재연결 |
| 닉네임 최소 루프 | `MyDetailPage.jsx`(NameForm), `MyPage.jsx`, `E2PropertyDetail.jsx` | /my/name 실저장(localStorage 프로필 name), 마이 헤더 하드코딩 "홍길동" 제거 → 실명 표시, E2 문의 생성 시 sender_name=닉네임(없으면 '문의자' 폴백). receiver_name은 '양도자' 유지(콘솔 묶음 ⑥ 선행 필요) |

## 이전 완료 (2026-07-03 낮 — 마켓플레이스 루프)

| 항목 | 파일 | 내용 |
|------|------|------|
| A7 코칭 실연결 | `src/screens/A7SellerDashboard.jsx`, `src/lib/gemini.js` | 더미 `SELLER_SITUATION` 제거 — 실 매물 기반 상황(완성도·사진수·양도방식)만 프롬프트에 조건부 포함, 가짜 수치 미전송. 매물 0개면 Gemini 호출 없이 고정 문구. 호출 빈도: 일일 캐시(진입당 1회 아님) |
| E1 임시저장 | `src/screens/e1/E1Context.jsx`, `E1Step5.jsx` | sessionStorage `modu_e1_draft` — data 변경 시 저장, 마운트 시 복원(새로고침 생존), 제출 성공 시 삭제. 전 필드 직렬화 가능 확인 |
| E2 상세 실연결 | `src/screens/E2PropertyDetail.jsx` | t1~t3 더미 제거 → `eq('id', id).single()` 실조회. not-found 안내("매물을 찾을 수 없어요"), 검수 '숨김' 블록 미표시, 수정본 우선, 사진 갤러리/플레이스홀더, 상권분석·조회수 등 무데이터 항목 숨김 |
| ExplorePage 실연결 | `src/screens/ExplorePage.jsx` | ALL_LISTINGS 더미 제거 → published 전체 조회. 기본 정렬 완성도순(calcScore 내림차순+최신순), 지역 필터(address 포함 검색), 업종 필터 제거(컬럼 없음), 카드 → `/e2/{실id}` |
| A7StartupFeed 실연결 | `src/screens/A7StartupFeed.jsx` | 양도 매물 t1~t8 더미 링크 제거 → 완성도순 상위 5개 실조회. 0건 안내. (빈 점포·프랜차이즈 카드는 아직 더미) |
| .env.example 정비 + 키 보안 교정 | `.env.example`, `docs/STATUS.md` | Supabase URL/ANON_KEY 항목 추가, 옛 서비스명 주석 갱신. "하드코딩" 표현 삭제(사실 아님 — 이미 env 사용 중) |
| 서브에이전트 2개 | `.claude/agents/테스트.md`, `조사.md` | 테스트 실행 전담 + 코드 조사 전담 (실행 강제·추측 금지 규칙 포함) |
| 테스트 45개 | `tests/` | 시나리오2 강화(새로고침 후 입력값 유지 단언), 시나리오2b(제출 후 draft 삭제), e2detail 2, explore 2, startup-feed 2 추가 — 45 passed |

## 이전 완료 (2026-07-02 밤 — A7 실데이터)

| 항목 | 파일 | 내용 |
|------|------|------|
| 실거래가 API 500 해결 | `src/lib/marketData.js` | 서비스명 `RTMSDataSvcNrgTrade` + 오퍼레이션명 교체, `_type=json` 제거, XML DOMParser 파싱, resultCode `'000'`, 필드명 교체 → 실데이터 수신 확인 |
| /e1/5 직접 URL 진입 가드 | `src/screens/e1/E1Step5.jsx` | `!data.aiDraft` 조건 추가 — "아직 매물 작성이 완료되지 않았어요" + "처음부터 시작" 버튼(→/e1/1) |
| calcScore 사진 조건 버그 수정 | `src/screens/e1/E1Step5.jsx` | `data.photosAdded \|\| true` → 배열 길이 합계 비교 — 사진 없는 매물 완성도 77→65점, 사진 유무 12점 차이 정상화 |
| 테스트 인프라 커밋 (33개) | `tests/`, `playwright.config.js` | 온보딩5 / 매물등록13 / 가드8 / 엣지7 — 시나리오8(사진 완성도 검증) 포함 전체 33 passed |
| calcScore 공용 모듈 분리 | `src/lib/completeness.js` | `calcScore(data)` + `listingToScoreInput(row)` 분리 — E1Step5·A7 양쪽에서 import |
| listings device_id 컬럼 추가 | Supabase SQL + `src/screens/e1/E1Step5.jsx` | `ALTER TABLE listings ADD COLUMN device_id TEXT` 실행 후 저장 시 `getDeviceId()` 값 기록 |
| A7 내 매물 실조회 | `src/screens/A7SellerDashboard.jsx` | `supabase.from('listings').select('*').eq('device_id', myId)` — `myListings` 상태 연결, 브라우저 콘솔 `Array(1)` 확인 |
| A7 완성도 숫자 실연결 | `src/screens/A7SellerDashboard.jsx` | 하드코딩 72% 제거 → `calcScore(listingToScoreInput(myListings[0]))` 실값 표시. 로딩 중 `"..."`, 매물 없음 안내 문구 처리 |
| A7 매물 카드 실연결 + 사진 배지 | `src/screens/A7SellerDashboard.jsx` | 더미 카드 → `myListings[0]` 실데이터, "📷 사진 없음" 배지 + 완성도 힌트 |
| E1Step5 중복 제출 방어 | `src/screens/e1/E1Step5.jsx` | `useRef` in-flight 플래그 + 버튼 `disabled` — 동기 이중 클릭 시 insert 2→1회 (시나리오3 검증) |
| 양도자 변형 테스트 | `tests/seller-edge.spec.js` | 빈 입력·새로고침·중복 제출·뒤로가기·사진없이 제출·AI초안 가드·직접 URL 접근 — 크래시 0건 |

---

## 라우트 & 화면 완성도

| 경로 | 화면 | 상태 | 비고 |
|------|------|------|------|
| `/` | A1 스플래시 | ✅ 완성 | 브랜드 색 #1683B8(최종), ModuMark, 2초 후 /a2 |
| `/a2` | A2 카테고리 선택 | ✅ 완성 | 6개 카테고리, 멀티프로필 지원 |
| `/a3/seller` | A3 양도자 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a3/landlord` | A3 임대인 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a3/startup` | A3 창업준비 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a3/operating` | A3 운영중 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a3/business` | A3 기업회원 질문 | ✅ 완성 | 3문항 칩 선택 → A4 |
| `/a4` | A4 가입 방식 | ✅ 완성 | 카카오/네이버/Apple/휴대폰, 멀티프로필 분기 |
| `/a7/seller` | 양도자 대시보드 | ✅ 완성 | AI 코칭·완성도·매물카드 실데이터. 매출/통계/시장동향/거래처/필독은 "서비스 준비중" |
| `/a7/landlord` | 임대인 대시보드 | ✅ 완성 | 인박스·탭배지 실기능. 자산·통계·정보 섹션 "서비스 준비중"(E1p 실연결 전), 코칭 고정 문구 |
| `/a7/startup` | 창업준비 피드 | ✅ 완성 | AI 인사이트+창업진단, 일일 캐시 |
| `/a7/operating` | 운영중 대시보드 | ✅ 완성 | 매출입력 진입·인박스 실기능. 8슬롯 "서비스 준비중"(매출 데이터 연동 전), 코칭 고정 문구 |
| `/a7/business` | 기업회원 대시보드 | ✅ 완성 | 인박스·Push영업·E1b 진입 실기능. 수치·리드 슬롯 "서비스 준비중"(집계 연동 전), 코칭 고정 문구 |
| `/a7/browsing` | 그냥구경 피드 | ✅ 완성 | AI 트렌드(Gemini)·가입 유도 실기능. 카드 7종 판형 유지 + "콘텐츠 준비중" 정직 카피(수치 더미 0) |
| `/e2/:id` | 매물 상세 (양수자뷰) | ✅ 완성 | t1/t2/t3 샘플 |
| `/e2l/:id` | 상가 상세 (임차뷰) | ✅ 완성 | v1/v2/v3 샘플 |
| `/e1/1~5` | 양도자 매물 등록 5단계 | ✅ 완성 | AI 초안 Gemini 실연결 |
| `/e1p/1~5` | 임대인 상가 등록 5단계 | ✅ 완성 | AI 초안 Gemini 실연결 |
| `/e1b/1~5` | 기업회원 노출페이지 5단계 | ✅ 완성 | AI 트리거 Gemini 실연결 |
| `/d4/inbox` | 양도자 메시지함 | ✅ 완성 | 실데이터 + Realtime |
| `/d4/chat/:id` | 공용 1:1 대화 (양도자·창업준비·임대인·운영중) | ✅ 완성 | 실데이터 + Realtime, 연락처 교환 양측 동시 공개. 옛 카테고리별 더미 채팅 라우트(startup/landlord/operating)는 삭제·통일됨 |
| `/d4/landlord/inbox` | 임대인 메시지함 | ✅ 완성 | 실데이터 + Realtime |
| `/d4/startup/inbox` | 창업준비 문의함 | ✅ 완성 | 실데이터 + Realtime |
| `/d4/operating/inbox` | 운영중 업체문의함 | ✅ 완성 | 실데이터 + Realtime |
| `/d4/business/inbox` | 기업회원 문의함 | ✅ 완성 | 실데이터 + Realtime |
| `/d4/business/chat/:id` | 기업회원 1:1 대화 | ⚠️ 더미 보존 | 매칭 성사 B2B UI 보존 — 실연결 채팅에 얹기 예정 |
| `/explore` | 탐색 (매물 목록) | ✅ 완성 | 검색+필터+정렬 실동작 |
| `/community` | 커뮤니티 | ✅ 완성 | Q&A 탭 실연결 / 추천 탭 더미 / 오픈채팅 탭 "서비스 준비중" |
| `/community/post/:id` | 커뮤니티 포스트 | ✅ 완성 | Q&A 글 실조회+댓글 실동작 / 피드 더미 글(f1~f5)은 더미 유지 |
| `/my` | 마이 페이지 | ✅ 완성 | ⓪~⑦ 8블록, ProfileSwitchSheet |
| `/my/:section` | 마이 상세 (16섹션) | ✅ 완성 | 이름 실저장·FAQ 등 유지 / 사업자·본인인증·PIN·기기·연락처·사업자정보·소셜 7섹션은 "서비스 준비중" |
| `/my/proposal-settings` | 제안받기 설정 | ✅ 완성 | 12개 분류 토글 |
| `/business/performance` | 기업 노출 성과 | ✅ 완성 | 집계 연동 전 "서비스 준비중" + /e1b CTA 실기능 (Gemini ⏸) |
| `/business/push` | Push 영업 | ✅ 완성 | 3단계 폼·검증 실동작, 발신은 "준비중" 토스트 (실발신 인프라 전 — 가짜 완료 화면 제거) |
| `/operating/sales-input` | 매출 입력 | ✅ 완성 | |
| `/auth-gate` | 인증 게이트 | ✅ 완성 | 3가지 트리거 |
| `/dev` | DevMenu | ✅ 완성 | 전체 화면 링크 |
| `/dev/brand` | 브랜드 미리보기 | ✅ 완성 | |
| `/dev/review-log` | 검수 로그 | ✅ 완성 | |
| `/dev/supabase` | Supabase 연결 테스트 | ✅ 완성 | 3단계 진단, 키 정보 표시 |

**총 라우트: 37개 / 에러: 0개** (죽은 더미 페이지 9개 삭제: /seller/×5·/e3·/community/room — 5e0acb0, /business/competitor·trend — 6a1be71. 미정의 경로는 catch-all이 홈으로 리다이렉트)

---

## AI 기능 현황 (Gemini 실연결)

| 함수 | 용도 | 캐시 | 폴백 | 사용 화면 |
|------|------|------|------|----------|
| `generateSellerCoaching` | 양도자 코칭 | 일일 ✅ | 정적 문구 ✅ | A7SellerDashboard |
| `generateMarketInsight` | E1 시세분석 | 요청시 | - | E1Step2 |
| `generateListingDraft` | E1 매물초안 | 요청시 | - | E1Step2 |
| `generateLandlordCoaching` | 임대인 코칭 | - | - | ⏸ 미사용 (입력이 더미 수치였음 — E1p 실연결 시 재개, 84bbb2b) |
| `generateLandlordListingDraft` | E1p 상가초안 | 요청시 | - | E1pStep2 |
| `generateRentalInsight` | 임대시세 해석 | - | - | ⏸ 미사용 (동일 사유, 84bbb2b) — E1p 흐름(E1pStep2)에선 계속 사용 |
| `generateStartupInsight` | 창업 인사이트 | 일일 ✅ | - | A7StartupFeed |
| `generateStartupDiagnosis` | 창업 진단 | 일일 ✅ | - | A7StartupFeed |
| `generateOperatingCoaching` | 운영 코칭 | - | - | ⏸ 미사용 (입력이 더미 수치였음 — 매출 데이터 연동 시 재개, a04c779) |
| `generateOperatingDiagnosis` | 운영 진단 | - | - | ⏸ 미사용 (동일 사유, a04c779) |
| `generateBusinessCoaching` | 기업회원 코칭 | - | - | ⏸ 미사용 (입력이 더미 수치였음 — 노출 집계 연동 시 재개, 3b51009) |
| `generateBusinessPerformanceInsight` | 성과 해석 | - | - | ⏸ 미사용 (마지막 사용처 성과 페이지도 입력이 더미 수치 — 집계 연동 시 재개, 6a1be71) |
| `generateBusinessTriggers` | E1b 트리거 | 요청시 | - | E1bStep2 |
| `generateBrowsingCopy` | 트렌드 문구 | 일일 ✅ | null 처리 ✅ | A7BrowsingFeed |
| `generateCommunityInsight` | 커뮤니티 인사이트 | 일일 ✅ | 정적 문구 ✅ | CommunityPage |

**AI 함수: 15개 / 사용 중 9개 실연결 · 6개 일시 중지(⏸ 입력이 더미 수치라 실데이터 연동 전까지 호출 제거) / 가짜 수치 프롬프트 0**

---

## 핵심 원칙 준수 현황

| 원칙 | 상태 | 비고 |
|------|------|------|
| DM 우선 (전화번호 비공개) | ✅ | 모든 D4 채팅 헤더에 안내 문구 |
| 연락처 교환 = 요청→수락 (양측 동시) | ✅ | ExchangeConfirmModal 전 D4Chat 구현 |
| B2C 매칭 성사 선언 없음 | ✅ | D4Chat: "연락처 교환 완료" |
| B2B 매칭 성사 표현 | ✅ | D4BusinessChat: "매칭 성사" |
| 타이핑 최소화 (칩/버튼 우선) | ✅ | A2/A3 전부 칩 선택 |
| 멀티프로필 지원 | ✅ | sessionStorage relay 패턴 |
| 브랜드 색 #1683B8 적용 (최종 확정) | ✅ | CSS token + 6개 대시보드 헤더 |
| ModuMark 심볼 노출 (최종 지오메트리) | ✅ | 6개 위치 (대시보드/마이/스플래시 등) |

---

## 백엔드 연결 현황 (Supabase)

| 항목 | 상태 | 비고 |
|------|------|------|
| Supabase 클라이언트 초기화 | ✅ | `src/lib/supabase.js`, supabase-js 2.110.0 |
| 기기 ID (임시 사용자 식별) | ✅ | `getDeviceId()` — localStorage UUID, 로그인 전 사용 |
| **listings 테이블** | ✅ | E1Step5 "매물 공개" → INSERT. 주소·층·면적·보증금·권리금·AI초안·시설·device_id 등 전체 저장 |
| **listings.device_id** | ✅ | 기기 기반 소유권 식별. `ALTER TABLE listings ADD COLUMN device_id TEXT` 적용 완료 |
| **A7 내 매물 조회** | ✅ | `device_id` 기준 SELECT → `myListings` 상태, 완성도 실값 A7 표시 |
| **Supabase Storage (사진)** | ✅ | E1Step4 사진 업로드 → "Modu Apps" 버킷. 공개 URL 반환. 삭제(×) 연동 |
| **주소 검색 (Daum Postcode)** | ✅ | E1Step1 바텀시트 임베드 방식. 상세주소 입력 자동 포커스 |
| **conversations 테이블** | ✅ | E2 "DM 문의하기" → 대화방 생성·중복 재사용. listing_name·emoji 저장 |
| **messages 테이블** | ✅ | D4Chat 메시지 전송 → INSERT. 낙관적 업데이트 + 실패 시 롤백 |
| D4Inbox 실시간 목록 | ✅ | Supabase Realtime 구독. 새 대화 자동 반영 |
| D4Chat 실시간 수신 | ✅ | messages 채널 구독. 상대방 메시지 자동 표시 |
| 연락처 교환 상태 | ✅ | conversations.contact_status 업데이트 (requested → accepted) |
| **profiles 테이블** | ✅ | 신규/기존 유저 분기용. 로그인 후 category 저장 → 재방문 시 바로 대시보드 |
| **AuthContext** | ✅ | `src/contexts/AuthContext.jsx`. `useAuth()` 훅으로 전역 로그인 상태 관리 |
| **AuthCallbackPage** | ✅ | `/auth/callback` 라우트. profiles 체크 → 신규: 프로필 생성 후 대시보드 / 기존: 바로 대시보드 |
| **이메일 Magic Link** | ✅ (개발용) | A4 하단 이메일 입력 → `signInWithOtp` → 링크 클릭 → 자동 세션. 개발 임시 수단 |
| **로그아웃** | ✅ | MyPage → 로그아웃 버튼 → `supabase.auth.signOut()` → A2 이동 |
| **개발용 로그인 배지** | ✅ | MyPage 프로필 아래 `🟡 로그인됨: (이메일)` 표시 (출시 전 제거 예정) |
| RLS 설정 | ⚠️ 울타리 수준 | 전 테이블 DELETE 차단(실증 완료) + profiles auth 정석 + 커뮤니티 dev 정책. SELECT/INSERT/UPDATE는 여전히 개방 — device_id 위조 방어 없음. 정식 RLS는 로그인 도입 시 |

---

## 카카오 로그인 진행 현황

### 완료된 설정
| 항목 | 상태 |
|------|------|
| 카카오 앱 ID | `1501395` |
| 카카오 로그인 활성화 | ✅ ON |
| OpenID Connect 활성화 | ✅ ON |
| REST API 키 → Supabase 입력 | ✅ |
| Client Secret → Supabase 입력 | ✅ |
| Redirect URI 연결 (Kakao → Supabase) | ✅ |
| 동의항목: 닉네임 (profile_nickname) | ✅ 필수동의 |
| 동의항목: 프로필 이미지 (profile_image) | ✅ 설정됨 |

### 현재 막힌 지점
**KOE205 에러** — `account_email` 동의항목 미설정

- Supabase GoTrue가 카카오 OAuth 요청 시 `account_email` 스코프를 서버에서 강제로 추가함
- `account_email`은 카카오 비즈앱(사업자 인증) 없이는 동의항목 설정 자체가 불가
- 클라이언트 코드(`scopes` 옵션)로는 제거 불가 — GoTrue 서버 레벨에서 추가됨

### 다음 할 일 (순서대로)
1. **scope에서 이메일 제거 방법 확인** → 로그인 성공 여부 재확인
2. **Supabase URL Configuration** → Redirect URLs에 `http://localhost:5173/**`, `http://localhost:5174/**` 추가 필요
3. **로그인 후 redirect 처리** → AuthCallbackPage에서 profiles 체크 후 대시보드 이동 (코드 완성됨, 테스트 필요)
4. **user_id 데이터 귀속** — 로그인 완료 후 listings·conversations의 임시 device_id를 실제 auth.uid()로 교체
5. **카카오 비즈앱 전환** → 승인 후 `account_email` 선택동의 설정 → 완전 해결

### 근본 해결책
- **단기**: 카카오 비즈앱(사업자등록증) 신청 → 심사 2~5일 → 승인 후 즉시 해결
- **대안**: 커스텀 카카오 SDK + Supabase Edge Function (GoTrue 우회)

---

### ⚠️ 출시 전 필수 보안 작업

> 울타리 RLS 적용됨(전 테이블 DELETE 차단·profiles auth 정석). 그러나 SELECT/INSERT/UPDATE는  
> 여전히 개방 상태고 device_id는 위조 가능 — 실서비스 전 아래를 반드시 교체해야 합니다.

| 대상 | 현재 | 교체 후 |
|------|------|---------|
| `listings` RLS | 울타리 (DELETE만 차단) | `user_id = auth.uid()` 본인 매물만 수정/삭제 |
| `conversations` RLS | 울타리 (DELETE만 차단) | `sender_id = auth.uid() OR receiver_id = auth.uid()` |
| `messages` RLS | 울타리 (DELETE만 차단) | 해당 conversation 참여자만 읽기/쓰기 |
| Storage "Modu Apps" RLS | allow_all | `auth.uid()` 소유 객체만 삭제 가능 |
| `getDeviceId()` | localStorage UUID | Supabase Auth UID로 교체 |

---

## 기타 세팅 현황

| 항목 | 상태 |
|------|------|
| Remote Control (원격 개발 세팅) | ✅ |
| 브랜드 자산 (ModuMark, 컬러 토큰) | ✅ 최종 확정 반영 완료 (docs/brand/ 패키지 기준) |

---

## 다음 후보 (우선순위)

| 우선순위 | 항목 | 내용 |
|----------|------|------|
| 🔴 | **내일(7/6): 고객 시뮬레이션** | 신규 고객(양도자) 시나리오 — `docs/SIM-BRIEF-20260706.md` 참조. 발견 즉시 조각으로 처리 |
| 🔴 | **대표님 결정 대기** | ①예시→실매물 승격 UX(수정 화면 "실매물로 공개" 버튼 vs 현행 재등록 안내) ②룩스필라테스(코워크 실매물 92%) 노출 유지 여부 ③E2L·임대인 축 — `docs/LANDLORD-PLAN.md` 7문항 ④NOT NULL 콘솔 SQL 실행 완료 여부 확인 |
| 🔵 | 카카오 OAuth 마무리 | KOE205 — email scope 제거 확인 후 재시도 (비즈앱 전환과 병행). 인증 게이트는 트리거 기반 대체 운영 중 |
| 🔵 | D4 실 상대방 수락 흐름 | 연락처 교환 "수락"이 현재 요청자 화면의 더미 버튼 — 상대방 화면에 수락/거절 UI + Realtime 반영으로 교체 |
| ⚪ | 정식 RLS | 로그인 도입 시 device_id→auth 기반 전환과 함께 (현재 울타리 수준 — DELETE 차단만, UPDATE 미차단 스모크 실증) |
| ⚪ | API 키 서버사이드 프록시 이전 | `VITE_` 환경변수는 브라우저 번들에 노출 — 출시 전 Edge Function 이전 + 키 재발급 |
| ⚪ | 커뮤니티 오픈채팅 실연결 | 그룹 채팅 데이터 모델 설계부터 — 별도 세션 |
| ⚪ | A7 준비중 섹션 실데이터 연동 | 시장동향(국토부)·거래처(기업회원)·콘텐츠·매출(POS) — ComingSoon 자리에 순차 연결 |
| ⚪ | D4BusinessChat 매칭성사 실연결 | 보존된 B2B UI를 실연결 채팅에 얹기 |
| ⚪ | 빈 점포 DM + 카드 더미 (E2L 포함) | 임대인 E1p 실연결 선행 필요 — E2L 더미 상세(v1~v3)도 이 축에서 함께 정리 |
| ⚪ | Storage 고아 파일 정책 | 매물 완전삭제 기능 도입 때 함께 결정 |
| ⚪ | 수정 모드 전용 draft | 새로고침 시 수정 진행 내용 소실 — 필요 시 수정 전용 draft 키 분리 |
| ⚪ | AI 검수 뱃지 기준 상향 | 검수 품질(keep/edit 비율) 기반 상향 여지 |

---

## 준비중 항목 (의도적 미구현)

- **카카오 로그인** — KOE205 에러로 중단. 비즈앱 전환 후 재시도 예정 (코드는 완성됨)
- **네이버 로그인** — Supabase 기본 provider 없음. 커스텀 구현 필요. 비즈앱 전환도 필요
- **애플 로그인** — Apple Developer 계정 필요 ($99/년). 계정 확보 후 연결 가능
- **휴대폰 번호 로그인** — 한국 SMS 제공사(NHN Cloud SENS 등) 계약 필요
- **user_id 데이터 귀속** — 현재 listings·conversations·messages가 device_id(임시) 기반. 로그인 완료 후 auth.uid() 기반으로 교체 필요
- **다른 카테고리 매물 저장** — E1p(임대인 상가), E1b(기업회원) Supabase 미연결 (E1 양도자만 연결됨)
- **공공데이터 자동채움** — 주소 입력 후 건축물대장 자동채움 미연결
- 로그아웃 / 회원탈퇴 (Auth 연결 전)
- 결제 수단 실등록 (PG 연동 전)
- Push 영업 실발송 (알림 인프라 전)
- 커뮤니티 채팅방 실시간 메시지 (현재 D4Chat만 Realtime 연결)
- 프리미엄 멤버십 구독 결제
- 노출 3층 (무료/프리미엄/광고) 실로직

---

## 브랜드 자산 현황

| 자산 | 상태 |
|------|------|
| Primary Blue: #1683B8 (최종 확정) | ✅ CSS `--color-brand-blue` 토큰 — 기존 토큰명 유지, 값만 교체 |
| 컬러 토큰 | ✅ `src/index.css` @theme 블록 (새 8토큰 매핑, tagline 전용색은 Mint로 흡수) |
| Pretendard 폰트 | ✅ CDN (index.html) |
| 워드마크 서체 Cafe24 Ssurround | ⬜ 미도입 — 색 우선 반영, 필요 시 별도 조각 |
| ModuMark SVG 컴포넌트 (최종 지오메트리 — 돌기 8개) | ✅ `src/components/ModuMark.jsx` |
| ModuSpinner (3D 궤도 로딩) | ✅ `src/components/ModuSpinner.jsx` — 행동 후 대기 4곳 적용 |
| favicon.svg | ✅ 새 심볼 + 16px 하이라이트 생략, theme-color meta |
| 반경/그림자 토큰 4개 | ✅ |
| 브랜드 패키지 원본 | ✅ `docs/brand/` 커밋됨 (스펙·레퍼런스 포함) |
