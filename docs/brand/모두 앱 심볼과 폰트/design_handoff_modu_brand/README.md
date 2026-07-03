# Handoff: 모두(modu) 브랜드 심볼 (최종 확정)

## Overview
"모두(modu)"는 상업용 부동산 생태계 플랫폼입니다. 자영업자·예비창업자·매도 운영자·기업 등 모든 참여자가 한곳에서 사고·팔고·운영·연결됩니다.
이 패키지는 **최종 확정된 브랜드 심볼**과 로고·컬러·타이포 스펙을 대상 코드베이스에 구현하기 위한 핸드오프 문서입니다.

태그라인: **Everyone, Everything!**

## About the Design Files
이 번들의 `.dc.html` 파일들은 **HTML로 만든 디자인 레퍼런스**입니다 — 의도한 외형을 보여주는 프로토타입이며, 그대로 복사해 배포할 프로덕션 코드가 아닙니다.
작업의 목표는 **이 디자인을 대상 코드베이스의 기존 환경(React, Vue, SwiftUI, 네이티브 등)에서 그 환경의 패턴·라이브러리로 재현**하는 것입니다. 환경이 아직 없다면 프로젝트에 가장 적합한 프레임워크를 골라 구현하세요.
심볼은 순수 SVG라 `modu-mark.svg` / `ModuMark.jsx` 를 거의 그대로 사용할 수 있습니다.
빠르게 외형만 확인하려면 `모두-확정-현황.html`(오프라인에서 바로 열리는 standalone 뷰어)를 브라우저로 여세요.

## Fidelity
**High-fidelity (hifi).** 최종 컬러·타이포·간격·심볼 지오메트리가 확정된 상태입니다. 컬러 hex와 심볼 SVG 좌표는 정확한 값입니다.

---

## The Symbol (심볼) — 최종
**컨셉** — 살아있는 "세포/미생물". 둥근 몸체(플랫폼·모두)에서 길이가 제각각인 돌기가 사방으로 뻗어 다양한 참여자에게 가닿는 생태계.

**최종 형태 (확정 사항)**
- 돌기 **8개** (이전 11개에서 정리).
- 몸체는 통통하게 — `circle r=23`.
- 돌기 길이를 **살짝** 변주하고, 전체를 **우상향(↗)으로 아주 약간만** 기울여 은은한 입체감·방향감. (과하지 않게 — 거의 균형에 가까운 방사형.)
- 좌상단 **광택 하이라이트(네거티브 스페이스)** + 작은 스파클로 천진한 입체·귀여움.

**구성 규칙**
- **단색**: 브랜드 컬러 한 가지만 사용 (그라데이션·다색 금지).
- **돌기**: 8개. 끝모양은 원(circle) 6개 + 둥근 사각(squircle) 2개, 크기 다양 (r 4.8 ~ 6.2).
- **입체감**: 색이 아니라 ① 돌기 길이 차이 ② 몸체 위 광택 하이라이트(배경색이 비치는 네거티브 스페이스)로만 표현. 하이라이트는 좌상단, 작은 스파클 포함.
- viewBox `0 0 100 100`, 내부 그룹 `transform="translate(9,9) scale(0.82)"`, 몸체 `circle cx50 cy50 r23`, stroke-width **3.6**, round cap.

**컬러 적용**
- 기본(밝은 배경): 몸체·돌기 = Primary Blue, 하이라이트 = 배경색(보통 흰색).
- 반전(컬러 타일 위): 몸체·돌기 = 흰색, 하이라이트 = 타일 색(예: Primary Blue).
- `ModuMark.jsx`는 `color`(마크 색)와 `highlight`(하이라이트 색) props로 두 경우를 모두 커버합니다.

**최소 크기**: 16px(파비콘)까지 또렷. 16px 이하에선 하이라이트를 생략해도 됩니다 (`highlight={color}`).

### SVG 지오메트리 (정확값)
돌기 stalk — `stroke=color, stroke-width 3.6, round cap`:
```
M 63.90 37.04 L 79.26 22.72  M 68.97 50.99 L 90.94 52.14  M 50.66 31.01 L 51.12 18.02
M 36.33 36.80 L 22.67 23.60  M 62.71 64.12 L 70.74 73.04  M 48.01 68.90 L 46.24 85.80
M 31.00 49.67 L 21.00 49.49  M 35.66 62.47 L 22.08 74.28
```
끝모양 (fill=color):
```
circle (79.26, 22.72) r5      circle (90.94, 52.14) r6.2    circle (51.12, 18.02) r6.2
circle (22.67, 23.60) r5.2    rect   (66.44, 68.74) 8.6×8.6 rx2.6
circle (46.24, 85.80) r5.4    rect   (16.50, 44.99) 9×9 rx2.7    circle (22.08, 74.28) r4.8
```
몸체 (fill=color): `circle (50, 50) r23`
하이라이트 (fill=highlight): `ellipse (41.5, 41.5) rx7 ry4.8 rotate(-38)` + `circle (35.8, 37.6) r2`
모든 요소는 그룹 `transform="translate(9,9) scale(0.82)"` 안에 위치.
> 전체 마크업은 `modu-mark.svg` / `ModuMark.jsx` 에 그대로 들어 있습니다.

---

## Loading Spinner (로딩 애니메이션) — 최종
심볼의 **3D 굤도 회전**: 몸체·광택은 고정, 돌기 8개가 한 몸처럼 구(球) 굤도를 돌며 몸체 앞뒤로 지나갑니다.
- 뒤쪽 돌기: 작고 흐릿하게(opacity 0.45, scale↓) / 앞쪽: 크게 — 깊이감.
- 회전은 **불규칙**: 기본 3.8 rad/s + 사인파 서지(빨라졌다 느려졌다) — ‘살아있는 세포’ 느낌.
- 구현: `ModuSpinner.jsx` (props: `size`, `color`, `highlight`, `speed`). 스플래시 = 흰 스피너 on Primary Blue, 인라인 로더 = 블루 스피너 on 흰 배경.
- 데모: `모두 로딩 애니메이션.dc.html`의 2a(스플래시)·2b(인라인).

## Wordmark & Lockups (로고)
- **워드마크**: 한글 `모두`(메인) + 로마자 `modu`. 워드마크 전용 서체는 **카페24 써라운드(Cafe24 Ssurround)** — 둥근 볼드로 심볼과 같은 결. (본문·UI는 Pretendard 유지.)
- **비율**: 락업에서 심볼 높이 ≈ 워드마크 폰트 사이즈의 **1.6배** (예: 워드마크 46px → 심볼 74px). 심볼이 글자보다 작아 보이지 않게.
- **세로 락업(권장)**: 심볼(좌) + [`모두`(상) / `Everyone, Everything!`(하)]. 태그라인은 `모두` 글자 폭에 맞춰 폭을 제한해 두 줄로 자연스럽게 줄바꿈.
- **가로 조합**: 심볼 + `모두` + `modu`(작게).
- 어두운 배경: 마크·글자 흰색(또는 Mint 마크).

### 타이포 스펙
- `모두` (워드마크): **Cafe24 Ssurround** (단일 웨이트), letter-spacing **−0.01 ~ −0.02em**.
  - 폰트 소스: `https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24Ssurround.woff` (카페24 무료 폰트, 상업적 사용 가능 — 자체 호스팅 권장).
- `modu`: SemiBold 600, letter-spacing **0.12em**.
- 태그라인 `Everyone, Everything!`: Bold 700, letter-spacing −0.012em, color = Primary Blue, line-height 1.22. **항상 쉼표 다음 줄바꿈** (`Everyone,` / `Everything!`) — 첫 줄은 왼쪽, **둘째 줄은 오른쪽 정렬**로 `모두`의 오른쪽 끝에 맞춤.

---

## Screens / Applications
적용 예시 파일:
- **`모두 확정 현황 v2.dc.html`** — 캐노니컬 레퍼런스. 심볼(기본/반전/소형) · 워드마크/락업 · 컬러 · 타이포 · 앱 아이콘 · 스플래시.
- **`모두 브랜드 적용.dc.html`** — 실사용 적용: 앱 아이콘 / 스플래시 / 명함 / 간판·사이니지 / 에코백·굿즈 / SNS 프로필 / 웹·파비콘.

각 적용의 핵심:
1. **App Icon** — 둥근 사각 타일(Primary Blue), 흰색 마크. iOS 슈퍼엘립스 비율.
2. **Splash** — Primary Blue 전체 배경, 중앙 흰색 마크 + `모두`(흰색, 800) + 태그라인(Mint).
3. **명함** — 앞면: 흰 배경 + 좌상단 마크/`모두` + 이름·연락처. 뒷면: Primary Blue + 흰 마크 + 태그라인. 320×188, radius 16.
4. **간판/사이니지** — Primary Blue 패널 위 흰 마크 + `모두`.
5. **에코백/굿즈** — 크라프트(#E8E2D4) 위 Primary Blue 마크 + `모두`.
6. **SNS 프로필** — 원형 아바타(Primary Blue, 흰 마크) + `모두` / `@modu_kr` + 팔로우 버튼.
7. **웹 · 파비콘** — 16px 마크, URL `modu.kr`.

## Interactions & Behavior
브랜드 자산(정적)이라 인터랙션은 없음. 앱 구현 시:
- 버튼(팔로우 등): Primary Blue 배경, 흰 텍스트, radius 100px(pill), weight 700.
- 카드: radius 20–24, border `1px #DAE8F4`, 그림자 `0 6px 22px rgba(22,131,184,0.06)`.

## Design Tokens
### Colors
| Token | Hex | 용도 |
|---|---|---|
| Primary Blue | `#1683B8` | 메인 브랜드 색 (마크·버튼·강조) |
| Ink | `#123A5E` | 본문/제목 텍스트, 다크 패널 |
| Mint | `#A9DDF2` | 어두운 배경 위 보조 텍스트/마크 |
| Tint Surface | `#E6EFFA` | 옅은 면/배경 |
| Paper | `#F4F8FE` | 페이지 배경 |
| Border | `#DAE8F4` | 카드/구분선 |
| Muted Text | `#5A7896` | 보조 텍스트 |
| Label | `#3E83B0` | 캡션/라벨 |

> 그림자: Primary `rgba(22,131,184,α)`, Ink `rgba(18,58,94,α)`.

### Typography
- 워드마크 전용: **Cafe24 Ssurround** (위 참조). 본문·UI Family: **Pretendard** (https://cdn.jsdelivr.net/gh/orioncactus/pretendard / npm `pretendard`). 한글+로마자+숫자 단일 가족.
- Display 800 / Title 700 / Body 400. Scale 예: Display 36–92px, Title 22px, Body 16px(line-height 1.6).

### Radius / Spacing
- Radius: 카드 20–24, 타일/아이콘 ~22% (슈퍼엘립스 느낌), pill 100px.
- 컨테이너 max-width 1160px, padding 40px.

## Assets
- 심볼: 코드 생성 SVG (외부 에셋 없음) — `modu-mark.svg`, `modu-mark-white.svg`, `ModuMark.jsx`.
- 폰트: Pretendard (오픈 라이선스).
- 적용 예시의 사진/건물/사람은 모두 **플레이스홀더**(단색·그라데이션 블록) — 실제 에셋으로 교체 필요.

## Files
- `modu-mark.svg` — 기본(파란 마크 / 흰 하이라이트).
- `modu-mark-white.svg` — 반전(흰 마크 / 파란 하이라이트, 컬러 타일용).
- `ModuMark.jsx` — `size`·`color`·`highlight` props 받는 React 컴포넌트 (권장 구현 소스).
- `ModuSpinner.jsx` — 3D 굤도 회전 로딩 스피너 React 컴포넌트 (`size`·`color`·`highlight`·`speed` props).
- `모두 로딩 애니메이션.dc.html` — 스피너 데모 레퍼런스 (2a 스플래시 / 2b 인라인 채택, 1a–1c는 탈락안).
- `모두-확정-현황.html` — standalone 뷰어(오프라인에서 바로 열림). 외형 확인용.
- `모두 확정 현황 v2.dc.html` — 캐노니컬 디자인 레퍼런스(프로젝트 환경에서 렌더).
- `모두 브랜드 적용.dc.html` — 실사용 적용 예시 레퍼런스.
- `support.js` — 위 `.dc.html` 들을 렌더하기 위한 런타임.

> `.dc.html`은 디자인 레퍼런스입니다. 실제 구현은 대상 코드베이스 환경에서 위 토큰·SVG로 재현하세요.
