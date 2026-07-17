# SessionStart 훅: 세션 시작 시 원격 최신화 — 결과 한 줄만 출력
[Console]::OutputEncoding = [Text.Encoding]::UTF8
try {
  $out = git pull --ff-only 2>&1
  $line = ($out | Select-Object -First 1)
  Write-Output "[git pull] $line"
} catch {
  Write-Output "[git pull] 실패: $($_.Exception.Message)"
}
exit 0
