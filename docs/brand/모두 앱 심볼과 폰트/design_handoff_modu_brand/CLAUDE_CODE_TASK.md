# Task: 모두(modu) 브랜드를 앱에 반영하기

이 폴더는 "모두" 앱의 **최종 확정 브랜드 자산**입니다. 아래 순서로 대상 앱 코드베이스에 반영하세요.
상세 스펙(심볼 지오메트리, 컬러, 타이포, 적용 규칙)은 `README.md`에 전부 있습니다 — 이 파일은 작업 지시 요약입니다.

## 1. 심볼 컴포넌트 추가
- React 앱이면 `ModuMark.jsx`를 그대로 복사해 사용 (props: `size`, `color`, `highlight`).
- 그 외 환경이면 `modu-mark.svg`(밝은 배경용) / `modu-mark-white.svg`(Primary Blue 타일용)를 에셋으로 추가.
- 16px 이하(파비콘 등)에서는 하이라이트 생략: `highlight={color}`.
- 심볼 지오메트리는 **수정 금지** (최종 확정). 색상만 규칙에 따라 교체.

## 2. 디자인 토큰 등록
프로젝트의 토큰 시스템(테마 파일, Tailwind config, CSS 변수 등)에 등록:
```
--modu-primary: #1683B8;   /* 마크·버튼·강조 */
--modu-ink:     #123A5E;   /* 텍스트·다크 패널 */
--modu-mint:    #A9DDF2;   /* 다크 배경 위 보조 */
--modu-tint:    #E6EFFA;   /* 옅은 면 */
--modu-paper:   #F4F8FE;   /* 페이지 배경 */
--modu-border:  #DAE8F4;   /* 카드·구분선 */
--modu-muted:   #5A7896;   /* 보조 텍스트 */
--modu-label:   #3E83B0;   /* 캡션·라벨 */
```
브랜드 색은 Primary Blue **하나만** — 그라데이션·다색 변형 금지.

## 3. 타이포그래피
- 본문·UI: **Pretendard** 도입 (npm `pretendard` 또는 CDN). 워드마크를 제외한 전 텍스트에 적용.
- 워드마크 `모두` 전용 서체: **Cafe24 Ssurround** (`https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24Ssurround.woff`, 단일 웨이트, letter-spacing −0.01~−0.02em). 로고/워드마크에만 사용 — 본문에 쓰지 말 것.
- 로마자 `modu`: Pretendard 600, letter-spacing +0.12em.
- 태그라인 `Everyone, Everything!`: 700, Primary Blue.
- 스케일: Display 800 / Title 700 / Body 400(line-height 1.6).

## 4. 로딩 스피너
- React면 `ModuSpinner.jsx`를 그대로 복사해 사용 (props: `size`, `color`, `highlight`, `speed`).
- 스플래시: `<ModuSpinner color="#FFFFFF" highlight="#1683B8" />` on Primary Blue 배경.
- 인라인 로딩(콘텐츠 대기 등): `<ModuSpinner />` (블루 마크, 흰 배경).
- 비-React 환경이면 동일 로직(구 굤도 투영 + 불규칙 회전)을 해당 환경으로 포팅 — 수식은 파일 내 주석 참조.

## 5. 앱 적용 지점
- **앱 아이콘**: Primary Blue 둥근 사각 타일 + 흰 마크(`modu-mark-white.svg` 방식).
- **스플래시**: Primary Blue 풀블리드, 중앙 흰 마크 + `모두`(흰 800) + 태그라인(Mint).
- **파비콘**: 16px 마크, 하이라이트 생략.
- **버튼**: Primary Blue bg, 흰 텍스트, pill(radius 100px), 700.
- **카드**: radius 20–24, border 1px `--modu-border`, shadow `0 6px 22px rgba(22,131,184,0.06)`.

## 6. 시각 검증
`모두-확정-현황.html`을 브라우저로 열어(오프라인 동작) 구현 결과와 비교하세요.
적용 예시(아이콘·스플래시·명함 등)는 `모두 브랜드 적용.dc.html` 참고.
