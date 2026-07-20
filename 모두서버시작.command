#!/bin/bash
# 모두 개발 서버 시작 (맥) — 더블클릭으로 실행
# 윈도우 모두서버시작.bat 대응
cd "$(dirname "$0")" || exit 1

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

echo "=============================================="
echo "  모두 개발 서버를 시작합니다"
echo "----------------------------------------------"
echo "  이 맥에서:     http://localhost:5173"
if [ -n "$IP" ]; then
  echo "  아이폰에서:    http://${IP}:5173"
  echo "  (아이폰이 같은 와이파이에 연결돼 있어야 합니다)"
else
  echo "  아이폰 접속용 IP를 찾지 못했습니다 (와이파이 연결 확인)"
fi
echo "  끄려면 이 창에서 Control+C"
echo "=============================================="
echo ""

npm run dev -- --host
