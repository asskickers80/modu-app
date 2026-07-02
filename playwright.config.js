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
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
