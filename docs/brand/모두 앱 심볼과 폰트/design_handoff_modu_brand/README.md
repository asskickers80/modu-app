# Handoff: 모두(modu) Brand Identity

## Overview
"모두(modu)"는 상업용 부동산 생태계 플랫폼입니다. 자영업자·예비창업자·매도 운영자·기업 등 모든 참여자가 한곳에서 사고·팔고·운영·연결됩니다.
이 패키지는 그 **브랜드 아이덴티티**(심볼·로고·컬러·타이포·적용 예시)를 코드베이스에 구현하기 위한 핸드오프 문서입니다.

태그라인: **Everyone, Everything!**

## About the Design Files
이 번들의 `.dc.html` 파일들은 **HTML로 만든 디자인 레퍼런스**입니다 — 의도한 외형과 동작을 보여주는 프로토타입이며, 그대로 복사해 배포할 프로덕션 코드가 아닙니다.
작업의 목표는 **이 디자인을 대상 코드베이스의 기존 환경(React, Vue, SwiftUI, 네이티브 등)에서 그 환경의 패턴·라이브러리로 재현**하는 것입니다. 아직 환경이 없다면 프로젝트에 가장 적합한 프레임워크를 골라 구현하세요.
심볼은 순수 SVG라 `modu-mark.svg` / `ModuMark.jsx` 를 거의 그대로 사용할 수 있습니다.

## Fidelity
**High-fidelity (hifi).** 최종 컬러·타이포·간격·심볼 지오메트리가 확정된 상태입니다. UI는 코드베이스의 기존 라이브러리·패턴으로 픽셀에 가깝게 재현하세요. 컬러 hex와 심볼 SVG는 정확한 값입니다.

## The Symbol (심볼)
**컨셉** — 살아있는 "세포/미생물". 둥근 몸체(플랫폼·모두)에서 길이가 제각각인 돌기가 사방으로 뻗어 다양한 참여자에게 가닿는 생태계를 표현합니다.

**구성 규칙**
- **단색**: 브랜드 컬러 한 가지만 사용 (그라데이션·다색 금지).
- **입체감**: 색을 추가하지 않고 ① 돌기 길이 차이 ② 몸체 위 **광택 하이라이트(네거티브 스페이스, 배경색 비침)** 로만 표현. 하이라이트는 좌상단, 작은 스파클 포함.
- **귀여움**: 통통한 몸체 + 동글/스퀴클(둥근 사각) 돌기 끝.
- **돌기**: 11개, 끝모양은 원(circle)·둥근 사각(squircle) 두 종류, 크기 다양.
- viewBox `0 0 100 100`, 내부 그룹 `transform="translate(9,9) scale(0.82)"`, 몸체 `circle cx50 cy50 r22`.

**컬러 적용**
- 기본: 몸체·돌기 = Primary Blue, 하이라이트 = 배경색(보통 흰색).
- 반전(컬러 타일 위): 몸체·돌기 = 흰색, 하이라이트 = 타일 색(Primary Blue).
- `ModuMark.jsx`는 `color`(마크 색)와 `highlight`(하이라이트 색) props로 두 경우를 모두 커버합니다.

**최소 크기**: 16px (파비콘)까지 또렷. 16px 이하에선 하이라이트를 생략해도 됩니다.

**SVG path 데이터** — 돌기 stalk (stroke=color, width 3.4, round cap):
```
M 67.97 51.06 L 89.93 52.35 M 65.11 59.78 L 74.35 65.75 M 58.47 65.88 L 66.47 80.88 M 46.39 67.63 L 44.58 76.45 M 38.19 63.58 L 23.10 80.94 M 33.07 56.12 L 20.84 60.53 M 33.06 43.90 L 15.19 37.47 M 38.22 36.39 L 32.98 30.34 M 46.37 32.37 L 43.13 16.70 M 58.45 34.11 L 64.09 23.52 M 65.14 40.26 L 81.95 29.44
```
끝모양·몸체·하이라이트 좌표는 `modu-mark.svg` / `ModuMark.jsx` 에 그대로 들어 있습니다.

## Wordmark & Lockups (로고)
- **워드마크**: 한글 `모두` + 로마자 `modu`. 한글이 메인.
- **세로 락업(권장)**: 심볼(좌) + [`모두`(상) / `Everyone, Everything!`(하)]. 태그라인은 **`모두` 글자 폭에 맞춰** 폭을 제한해 두 줄로 자연스럽게 줄바꿈(예: `Everyone,` / `Everything!`). 두 줄이어도 균형이 맞도록 의도된 배치.
- **가로 조합**: 심볼 + `모두` + `modu`(작게).
- 어두운 배경: 마크·글자 흰색.

### 타이포 스펙
- `모두` (워드마크): Pretendard ExtraBold 800, letter-spacing **−0.045 ~ −0.05em**.
- `modu`: SemiBold 600, letter-spacing **0.12em**.
- 태그라인 `Everyone, Everything!`: Bold 700, letter-spacing −0.012em, color = Primary Blue, line-height 1.22.

## Screens / Applications
적용 예시는 `모두 브랜드 적용.dc.html` 참고. 각 장면:

1. **App Icon (홈 화면)** — 둥근 사각 타일(Primary Blue), 흰색 마크. iOS 슈퍼엘립스 비율.
2. **Splash** — Primary Blue 전체 배경, 중앙 흰색 마크 + `모두`(흰색, 800) + `Everyone, Everything!`(Mint). 하단 보조 카피.
3. **명함** — 앞면: 흰 배경, 좌상단 마크+`모두`, 하단 이름/직함/연락처(Ink/Muted). 뒷면: Primary Blue, 중앙 흰 마크 + 태그라인. 320×188, radius 16.
4. **간판/사이니지** — Primary Blue 패널 위 흰 마크 + `모두` + 보조 텍스트.
5. **에코백/굿즈** — 크라프트(#E8E2D4) 위 Primary Blue 마크 + `모두`.
6. **SNS 프로필** — 원형 아바타(Primary Blue, 흰 마크) + `모두` / `@modu_kr` + 팔로우 버튼.
7. **웹 · 파비콘** — 브라우저 탭 16px 마크, URL `modu.kr`.

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
| Tagline on dark | `#BCE4F4` | 다크 위 태그라인 |

> 그림자: Primary `rgba(22,131,184,α)`, Ink `rgba(18,58,94,α)`.

### Typography
- Family: **Pretendard** (https://cdn.jsdelivr.net/gh/orioncactus/pretendard / npm `pretendard`). 한글+로마자+숫자 단일 가족.
- Display 800 / Title 700 / Body 400.
- Scale 예: Display 36–66px, Title 22px, Body 16px(line-height 1.6).

### Radius / Spacing
- Radius: 카드 20–24, 타일/아이콘 ~22% (슈퍼엘립스 느낌), pill 100px.
- 컨테이너 max-width 1000–1160px, padding 40px.

## Assets
- 심볼: 코드 생성 SVG (외부 에셋 없음) — `modu-mark.svg`, `ModuMark.jsx`.
- 폰트: Pretendard (오픈 라이선스).
- 적용 예시의 사진/건물/사람은 모두 **플레이스홀더**(단색·그라데이션 블록) — 실제 에셋으로 교체 필요.

## Files
- `modu-mark.svg` — 기본(파란 마크/흰 하이라이트) 단일 심볼.
- `modu-mark-white.svg` — 반전(흰 마크, 컬러 타일용).
- `ModuMark.jsx` — `color`·`highlight`·`size` props 받는 React 컴포넌트.
- `모두 브랜드 적용.dc.html` — 적용 예시(앱·명함·간판·굿즈·SNS·파비콘) 레퍼런스.
- `모두 심볼 — 단색 귀여운입체.dc.html` — 심볼 단독 스펙/사이즈 레퍼런스.

> `.dc.html`은 디자인 레퍼런스입니다. 브라우저로 열어 외형을 확인하되, 실제 구현은 대상 코드베이스 환경에서 위 토큰·SVG로 재현하세요.
