# 공통 매물 서버 계약 v1

변경 ID: SERVER-CORE-20261124. [단계 오더](ORDER-shared-core-control-intranet-v1.md)의 서버 경계 구현이다. 기존 Auth/profiles/listings 원장을 그대로 사용하며 모바일 담당의 코드·공유 DB를 별도로 복제하지 않는다.

## 구현과 현재 연결 상태

- `api/listings.js`: 단일 POST `/api/listings` 진입점. Vercel과 로컬 Vite가 같은 handler를 사용한다.
- `api/_listingService.js`: 입력/버전/인증/출처/응답 검사와 승인 backend 인터페이스.
- `api/_listingPublic.js`: 공개 응답 전용 DTO. 본인 편집 응답과 분리한다.
- `src/lib/listingServerTransport.js`: 웹·앱 공용 전송 인터페이스. 오류·취소·시간초과에 직접 REST/익명 접근으로 자동 전환하지 않는다.

**운영 승인 저장소는 미연결이다.** 기본 진입점은 `503 CUTOVER_REQUIRED`이고 Auth·환경값·DB에 접근하기 전에 닫힌다. HTTP 본문/헤더/브라우저 설정/환경변수 하나로 열 수 없다. 현재 개발 UI는 이전 개발 어댑터를 유지한다. 새 서버 모드를 자동 선택하거나 실패 후 구형 경로로 바꾸지 않는다. 실제 DB 권한 전환·서버 배포·모바일 반영 완료가 아니다.

## HTTP 요청과 응답

JSON 요청은 최대128KiB이며 `version:1`과 operation별 허용 항목만 받는다. 헤더는 JSON과 선택적 Bearer다. 본인·쓰기 요청은 서버가 지정 프로젝트 Auth의 `getUser(token)`으로 검증한 UUID만 사용한다. JWT decode/localStorage/user_metadata/기기값/일반 회원 역할은 권한 근거가 아니다.

| operation | 필수 또는 허용 추가 항목 | 인증 | 결과 |
| --- | --- | --- | --- |
| public.list | filters | 불필요 | 공개 rows,nextCursor |
| public.get | listingId | 불필요 | 공개 row, 없거나 비공개면404 |
| owner.list | filters | 필수 | 승인된 본인 rows,nextCursor |
| owner.get | listingId | 필수 | 승인된 본인 row |
| create | listingId,requestId,payload,publication,consent | 필수 | 확인된 저장 row |
| update | listingId,requestId,expectedRevision,payload,consent | 필수 | 같은 ID 저장 row |
| status | listingId,requestId,expectedRevision,publication,consent | 필수 | 상태 변경 row |

listingId/requestId는 UUID이며 wire에서는 소문자로 정규화한다. update/status의 expectedRevision은0이상 안전정수다. create publication은 생략시draft, draft/published/example 중 하나다. status는 현재 정상 전이 대상7상태만 받는다. 기존 DB의 completed 행은 owner 조회에서 보존하되 새 completed 전이를 임의 추가하지 않는다. 공개는 published/negotiating만이다. 모든 쓰기에 requestId가 필요하다.

```json
{"version":1,"operation":"create","listingId":"11111111-1111-4111-8111-111111111111","requestId":"22222222-2222-4222-8222-222222222222","publication":"draft","payload":{"listing_type":"seller","title":"입력 제목","deposit":0}}
```

성공은 `{ok:true,version:1,operation,requestId?,row}` 또는 `rows,nextCursor`다. 쓰기 row는 `id,status,updated_at,revision` 네 항목만 반환한다. 0행/ID·상태·시각·revision 불일치는502다. owner 조회도 domain 허용 열만 반환하며 소유자/기기/인증 metadata/직원 권한을 싣지 않는다. 목록은 기본30/최대100, cursor 최대512자이며 필터는 listingType/dealType/status/limit/cursor/query만 받는다.

오류는 `{ok:false,version:1,error:{code,message}}`다. 인증401, 미승인/철회403, 없음404, 요청·revision 충돌409, 신뢰 backend 준비 전503을 구분한다. DB 원문·토큰·개인정보를 오류에 복사하지 않는다. 응답은 no-store다. CORS는 같은 출처 또는 서버에 정확히 등록된 출처만 허용하고 credentials/wildcard를 사용하지 않는다. OPTIONS는 Authorization/Content-Type만 허용한다.

## 쓰기 신뢰 필드와 기존 폼의 전환

- 일반 payload에서 user_id/device_id/id/status/views/role/roles/permissions/metadata·검증 결과·owner_nickname·클라이언트 시각을 거부한다. 과거 개발 어댑터와 구별한다.
- consent는 `{accepted:true,version:현재 TERMS_VERSION}`이다. 공개 create와 published/negotiating 전이에 필수다. 동의 시각/버전 저장, 사업자 확인 결과, 최초 공개 시각은 서버가 생성·검증해야 한다. 기존 폼의 terms_agreed_at/bizno_verified_at를 조용히 버리거나 서버 사실로 신뢰하지 않는다.
- latitude/longitude·공개 boolean·거래 유형·visibility는 명시 타입/enum으로 검증한다. 금액/면적의 명확한 숫자 문자열은 숫자로 정규화하고0/null을 보존한다. 빈 문자열·음수·NaN은 거부한다.
- 모바일/PC 폼은 생성 ID·요청 ID·revision·제출 snapshot을 폼 수명에 보존하고 서버 응답을 확인한 뒤 성공 표시한다. 기대 revision 없는 수정은 서버 경로에서 지원하지 않는다.
- `createListingServerTransport({endpoint,getAccessToken,trustedOrigins})`는 `execute`, `saveListing`, `loadListingForEdit`, `listPublic`, `getPublic`을 제공한다. payload는 새 서버 계약이며 구형 필드의 암묵 변환은 없다. endpoint/출처는 앱 설정에서만 선택하고 URL query나 사용자 입력에서 받지 않는다.
- 양쪽 기존 화면은 DTO 매핑과 동의/검증 변환을 먼저 구현한 뒤 서버 경로로 전환한다. 공개 DTO에는 소유권 식별자가 없으므로 브라우저 isOwnerOf로 편집 허가를 추정하지 않는다.

## 공개 반환과 개인정보

허용 DTO 키는 id/listingType/status/title/shopName/categoryMain/categorySub/bizCategory/dealType/regionLabel/area/floor/deposit/monthlyRent/transferFee/salePrice/description/imageUrls/location이다. location은 address/latitude/longitude만이다. 원본 user_id/device_id·연락처·사업자번호·원본 소개/수정/설정 JSON·검증 결과를 반환하지 않는다.

quiet, 누락·비공개 상호 설정에서는 자유 제목/소개/사진/정확 위치를 생략하고 허용된 지역·분류로 구조 제목을 만든다. 소유주 제목은 항상 구조 정보로 만들어 현 임차인 상호를 쓰지 않는다. 소개는 숨김·명시 빈 수정문 우선순위를 지키고 알 수 없는 review 선택은 숨긴다. 사진은 실제 Modu Apps/listings Storage 경로와 raster 확장자·그룹별 공개 설정을 확인한다. 정확 위치는 명시 공개/지도 동의와 정상 좌표가 있을 때만 도로명·지번 번호까지만 반환한다. client도 반환 키/문자열/enum/사진 URL을 검증한다.

문자열의 흔한 전화·이메일·URL/markup는 생략하지만 이 필터가 일반적인 개인정보 검수나 사진 내용 검증을 대신하지 않는다. 공개 승인/업로드 소유·자료 권리 확인은 아래 신뢰 backend의 조건이다. 기존 Storage 공개 URL 자체의 권한은 이 API로 바뀌지 않는다. Realtime은 원본 행을 DTO에 병합하지 않고 안전한 재조회 신호로 전환해야 한다.

## 모바일 담당자에게 요청하는 DB 영향 검토

[공유 접근 전환](shared-access-cutover.md)의 단일 SQL/대표 실행 절차를 유지한다. 이번 문서는 실행 SQL이 아니다. 현재 DB에는 승인 소유권/공통 listings API RPC가 확인되지 않았고 allow_all 아래 과거 user_id는 승인 근거가 아니다. modu_test·ACL 백업을 운영 권한 원장으로 전용하지 않는다.

새 backend의 호출 계약은 `execute({actorId,command})`다. 담당자는 아래를 한 원자적 저장 경계로 구현할 DB/RPC·권한 전환안을 제시한다. 설치되지 않은 RPC 이름을 PC가 추측해 호출하지 않는다.

1. 기존 listings를 참조하는 검증된 계정 소유권/활성·공개 승인과 서버가 생성한 신규 소유권. 기존 행 귀속의 승인 근거·불명확 행 보존 방법.
2. 현재 자격/소유권 재확인 → actor+requestId와 정규화 명령의 충돌 검사 → revision 검사 → 쓰기·새 revision·receipt·감사의 원자적 확정. **동일 요청 receipt 재조회도 현재 권한 철회·대상 삭제 상태를 먼저 검사한다.**
3. 계정 간 같은 requestId는 결과를 공유하지 않음. ID/서버 필드·listing_type 변경·공개 전이·동의/사업자 확인·업로드 소유권 등 업무 불변식도 backend가 검증한다. 공개 SQL/RPC를 직접 호출해도 같은 제한이 작동해야 한다.
4. 본인 관리와 승인 공개 자료 조회를 분리하고 공개 필터/정렬/페이지 경계를 승인 자료에만 적용한다. 단순 raw listings status 필터를 승인 원장으로 사용하지 않는다.
5. 직원 자격/권한은 향후 별도 서버 관리 구조. 회원6역할/metadata로 승격하지 않는다. 감사에는 행위자/대상/행위·사유/서버 시각/요청/결과를 기록하되 비밀번호·토큰·전체 개인정보는 복제하지 않는다.
6. 기존 앱 직접 접근·로그인 기기 병합·공개 뷰/Realtime·사진 Storage·DM/매출/알림에 미치는 영향과 호환 배포 순서, 권한 전환 실패 시 닫힌 상태 유지 방법. 기존 계정·개발 자료 삭제/재배분은 이 요청에 포함하지 않는다.
7. 검토된 구현 연결 뒤 실제 anon/A/B/C JWT와 양쪽 화면에서 본인 성공·타인 거부·동일 요청·철회·공개 마스킹·사진·재연결을 확인한다. 그때만 기본 pending backend를 교체한다.

## 검증 범위

신규 단위/실제 loopback HTTP·브라우저 검사는 모의 서명 인증과 메모리 승인 저장소를 사용한다. PC·모바일 역할 클라이언트의 동일 ID 생성/수정/재조회, 권한 철회, 재시도/revision, 공개 마스킹, 전송 취소/시간초과, 로컬 실제 pending API를 확인한다. 실제 Supabase 인증·DB 쓰기·RLS 격리·모바일 배포 왕복 완료를 뜻하지 않는다. 실행 수와 증거는 work-status에 기록한다.

인증 구현 근거: [Supabase getUser(jwt)](https://supabase.com/docs/reference/javascript/auth-getuser). 변경 전 [공식 changelog](https://supabase.com/changelog.md)와 현행 문서를 확인했으며 SDK/CLI/스키마를 업그레이드하지 않았다.
