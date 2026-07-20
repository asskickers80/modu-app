#!/bin/bash
# SessionStart 훅: 세션 시작 시 원격 최신화 — 결과 한 줄만 출력
# (.ps1 버전과 동일 동작 — 윈도우는 .ps1, 맥/리눅스는 이 파일)
out=$(git pull --ff-only 2>&1 | head -n 1)
echo "[git pull] ${out}"
exit 0
