import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    // 앱이 390px 모바일 기준으로 설계됨
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'ko-KR',
    // A2 구름 등 무한 플로팅 애니메이션이 클릭 안정성 검사에 걸리지 않도록
    // OS 모션 감소 설정을 에뮬레이트 (앱은 prefers-reduced-motion에서 애니메이션 off)
    // 주의: 이 Playwright 버전에선 최상위 use.reducedMotion이 무시됨 — contextOptions로 전달해야 적용
    contextOptions: { reducedMotion: 'reduce' },
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
