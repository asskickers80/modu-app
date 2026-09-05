# 알림 센터 (ORDER-close-flow-peer-stats-v1 §3에서 정식 구현 — 2026-09-05)

## 원칙 (변경 없음)
- 벨 = **"모두(플랫폼)가 사용자에게 보내는 알림" 전용**.
- **사용자 간 활동(새 문의·답장·안읽은 메시지)은 벨에 포함하지 않는다** —
  메시지 탭 점(MessageTabDot)·홈 문의 지표(MetricsPanel)가 담당. 중복 표시 금지.
- 상시 점 금지: 미확인 "모두 발송" 알림이 있을 때만 UnreadDot(단일 소스) 표시.
- 가짜 알림 금지: 표본 미충족 동향·시세 알림은 생성하지 않는다.

## 구현 현황 (close-flow-peer-stats §3)
- **저장**: `notifications` 테이블 (device_id/user_id·type·title·body·payload·sent_at·read_at,
  RLS: select+update 개방, insert는 크론용 개방, delete 차단).
- **생성**: `api/send-notifications.js` — 일 1회 크론(vercel.json, 20:30 UTC).
  룰은 `api/_notificationRules.js`(순수 함수, tests/notification-center.spec.js가 직접 검증).
  중복 방지 = `payload.dedupe_key`.
- **벨**: `HomeHeaderBar` 내부에서 미읽음 조회(`lib/notifications.js`) — 5축 자동 반영.
  탭 → `/notifications` (NotificationsPage).
- **목록**: 항목 탭 = 읽음 처리 + `payload.link` 딥링크. 빈 상태 정직 안내.

## 가동 중인 생성 룰 3종
| type | 트리거 | 딥링크 |
|---|---|---|
| repost_remind | roleData.{seller·landlord}.repost_remind_at 도달 (마감 흐름 "잠깐 쉴게요") | /e1/1 · /e1p/1 |
| lease_end | roleData.{축}.lease_end_date D-180/D-90/D-30 구간 진입 (구간별 1회) | 축 홈 |
| peer_trend / my_value | 신청자 + 동향 표본 충족 시에만 (첫 문의 매물 ≥5 — §4 기준 공유), 월 1회 | 축 홈 |

주의: 알림 신청 데이터는 profiles.profile_data.roleData에 있어야 크론이 본다 —
로그인 사용자만 대상(비로그인 신청분은 다음 로그인 때 syncProfileDataToServer로 합류).

## 향후 "모두 발송" 이벤트 후보 (미구현)
| 이벤트 | 소스 | 비고 |
|---|---|---|
| 폐업 확인 요청 | 국세청 상태조회 배치(api/check-business-closure) 감지 | 현재는 홈 확인 카드(ClosurePrompt) — 벨 병행 시 send-notifications에 룰 추가 |
| 일정 알림 | 임대료·부가세 등 역산 파생 | 일정관리 로드맵과 도메인 규칙표 공유 (fixed_costs due_day 재료 준비됨) |
| 매칭 제안 | AI 정제 양면 매칭 고도화 | 매칭 로드맵과 도메인 규칙표 공유 |
| 공지·정책 변경 | 운영 발송 | type='notice' 규격 준비됨 — 발송 도구만 필요 |
