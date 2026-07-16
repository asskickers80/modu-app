import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      // 공공데이터포털 CORS 우회 프록시
      // 브라우저 요청: /api/opendata/... → 실제 호출: https://apis.data.go.kr/...
      '/api/opendata': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/opendata/, ''),
      },
      // 카카오 OAuth CORS 우회 (개발 전용 — 프로덕션은 Vercel 함수 /api/kakao-auth 사용)
      '/kauth': {
        target: 'https://kauth.kakao.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/kauth/, ''),
      },
      '/kapi': {
        target: 'https://kapi.kakao.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/kapi/, ''),
      },
      // 네이버 OAuth CORS 우회 (개발 전용 — 프로덕션은 Vercel 함수 /api/naver-auth 사용)
      '/nid': {
        target: 'https://nid.naver.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/nid/, ''),
      },
      '/napi': {
        target: 'https://openapi.naver.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/napi/, ''),
      },
    },
  },
})
