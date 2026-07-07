# 점포라인 계약서 전자서명 앱 (contract-app)

종이 광고계약서를 iPad 웹앱으로 대체하는 내부 전용 앱입니다.
건별 정보 4개만 입력하면 나머지는 기본값으로 채워지고, 고객이 iPad에서
계약서를 읽고 자필·서명하면 PDF가 만들어져 저장되고 공유 시트로 바로 전달됩니다.

## 화면 흐름
1. **PIN 잠금** — 최초 실행 시 4자리 PIN 설정 (내부 전용 보호)
2. **작성** — 상호/업종/사업자번호/소재지 입력 + 광고 상품 버튼(하단/중간/최상단) → 미리보기
3. **고객 확인·서명** — 계약서를 끝까지 스크롤해야 서명 활성화 → 자필 "들었음" + 성명 + 서명
4. **완료** — Supabase 저장 → "고객에게 보내기"(iPad 공유 시트) → "광고료 결제하기"(점포라인 바로결제 새 창)
5. **계약 목록** — 상호 검색, PDF 재다운로드, 재공유

## 처음 설정 (1회)

```bash
cd contract-app
npm install
cp .env.example .env   # Supabase 값 입력
npm run dev            # 개발 서버
```

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에 `supabase/schema.sql` 내용을 붙여넣고 실행 (테이블 + 비공개 Storage 버킷 생성)
3. Settings > API의 URL과 anon key를 `.env`에 입력
4. Vercel/Netlify에 배포 (**HTTPS 필수** — 공유 시트가 HTTPS에서만 동작)
5. iPad Safari로 접속 → 공유 버튼 → **"홈 화면에 추가"** → 전체화면 앱으로 사용

## 실제 자산으로 교체할 것 (중요)

| 파일 | 내용 |
|---|---|
| `src/data/contract.js` | **제1조~제7조 본문** — 원본 계약서 사진 기준으로 전사 완료. 오탈자 최종 검수만 권장 |
| `public/stamp.png` | **회사 직인** 투명 배경 PNG를 이 이름으로 넣으면 PDF에 삽입됩니다 (없으면 임시 직인 자동 생성) |
| `src/data/categories.js` | 업종 목록 — '기타업종' 대분류는 점포라인 검색 페이지와 대조 권장 |
| `public/icon-*.png` | 앱 아이콘 (임시 아이콘 포함됨) |

## 기술 메모
- PDF: `pdf-lib` + 나눔고딕 임베드(subset) → A4 1페이지, 서명/자필은 투명 PNG로 합성
- 서명: `signature_pad` (터치/Apple Pencil), 지우고 다시 쓰기 지원
- 공유: Web Share API Level 2 (`navigator.share({ files })`) — 미지원 시 다운로드 폴백
- 결제: 이니시스 PG 보안 정책상 iframe 금지 → `window.open` 새 창 + 금액/결제사유 복사 버튼
- 저장: Supabase 비공개 버킷 `contracts` + `contracts` 테이블 (서명 시각·기기 정보 증빙 기록)
