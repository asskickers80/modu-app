// 훅 OS 분기기: settings.json 은 플랫폼 조건을 지원하지 않으므로
// 이 파일이 process.platform 을 보고 .ps1(윈도우) / .sh(맥·리눅스) 중 맞는 쪽을 실행한다.
// 사용: node .claude/hooks/dispatch.mjs <훅이름>   (예: session-start)
import { spawnSync } from 'node:child_process'

const name = process.argv[2]
if (!name) process.exit(0)

const isWin = process.platform === 'win32'
const [cmd, args] = isWin
  ? ['powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', `.claude/hooks/${name}.ps1`]]
  : ['bash', [`.claude/hooks/${name}.sh`]]

const r = spawnSync(cmd, args, { stdio: 'inherit' })
process.exit(r.status ?? 0)
