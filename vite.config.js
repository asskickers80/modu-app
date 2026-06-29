import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // 공공데이터포털 CORS 우회 프록시
      // 브라우저 요청: /api/opendata/... → 실제 호출: https://apis.data.go.kr/...
      '/api/opendata': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/opendata/, ''),
      },
    },
  },
})
