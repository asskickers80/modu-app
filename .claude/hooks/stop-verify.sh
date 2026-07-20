#!/bin/bash
# Stop 훅: 완료 검증 경고 — 코드 변경이 미커밋(=미검증)이면 완료 보고 금지 알림
# (.ps1 버전과 동일 동작 — 윈도우는 .ps1, 맥/리눅스는 이 파일)
dirty=$(git status --porcelain 2>/dev/null)
[ -z "$dirty" ] && exit 0
if echo "$dirty" | grep -qE '(^|[[:space:]])(src|api|tests)/'; then
  echo "⚠️ 미커밋 코드 변경 존재 — 빌드·전체 테스트 통과 전에는 완료 보고 금지 (미완료로 보고할 것)"
else
  echo "⚠️ 미커밋 변경 존재"
fi
exit 0
