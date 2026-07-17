# Stop 훅: 완료 검증 경고 — 코드 변경이 미커밋(=미검증)이면 완료 보고 금지 알림
# (기존 "미커밋 변경 존재" 경고를 흡수·확장. 빌드·테스트 실행 자체는 CLAUDE.md 완료 검증 규칙이 담당)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$dirty = git status --porcelain 2>$null
if (-not $dirty) { exit 0 }
$code = $dirty | Where-Object { $_ -match '(^|\s)(src|api|tests)/' }
if ($code) {
  Write-Output "⚠️ 미커밋 코드 변경 존재 — 빌드·전체 테스트 통과 전에는 완료 보고 금지 (미완료로 보고할 것)"
} else {
  Write-Output "⚠️ 미커밋 변경 존재"
}
exit 0
