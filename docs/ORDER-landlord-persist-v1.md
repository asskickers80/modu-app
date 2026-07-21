# ORDER-landlord-persist-v1 — 임대인 매물 영속화 (listings 통합 + 사이클 성립)

## 모드: 자율 판정. 멈춤 (a)(b)(c)만.

## 결정 (대표 확정)
- 미결 #4 = 방법 A: listings 재사용, listing_type 컬럼 구분('seller' 기본/'landlord').
- 미결 #5 = 양도인 동일: device_id 소유권 + lib/ownership.js 재사용. 신규 방식 금지.
- 목표: 등록→저장→탐색/상세 실데이터→문의 발신→임대인 수신 사이클 성립.

## 1. 스키마 (SQL 제시 후 멈춤 — 대표 콘솔)
- listings.listing_type text not null default 'seller' + CHECK ('seller','landlord')
- 임대인 전용 nullable 필드: deal_type('lease'/'sale'/'both'), 희망 매매가, 현 임대현황(보증금·월세 재사용 우선),
  캡레이트/수익률, 권장 업종, 입주 가능 시점, 권리관계. ※ 의미 겹치면 신설 금지, 재사용 매핑표 동봉.
- status CHECK 5종이 임대인에도 유효한지 판정, 변경 필요 시 SQL 포함.
- 기존 seller 행 무영향 확인 쿼리 포함.

## 2. E1p 저장 연결 (SQL 실행 후)
- E1pStep5 공개 시 listings INSERT(listing_type='landlord', device_id, status 준수).
- 양도인 E1 저장과 공통화 가능 부분 추출·재사용(복제 금지).
- 사업자번호 게이트: 임대인은 개인 소유주 가능 → 게이트 비적용 판정. 공유 코드에 박혀 있으면 listing_type 분기 우회, 근거 보고.

## 3. E2L 실데이터 연결
- 하드코딩 샘플 제거 → listings(landlord) 조회. ownership.isOwnerOf → 소유자 모드(E2 패턴). 
- 탐색: seller만 나오도록 명시 필터(임대인 탐색 노출은 시뮬 안건 유보), E2L 직링크 열람 가능.
- 예시 상가 1건 status='example' 생성.

## 4. DM 연결
- E2L "준비 중" 제거 → E2 동일 문의 플로우(게이트·returnTo·?contact=1 재사용). conversation listing_type 무관 확인, D4LandlordInbox 수신.
- 가이드/지표 이번 범위 아님.

## 테스트·보고
Playwright 사이클 전 구간 + 탐색 seller 필터. 전체 통과. 4줄(ls-remote) + 컬럼 매핑표 + 사업자 게이트 근거.
