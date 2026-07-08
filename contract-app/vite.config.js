import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 인트라넷 테스트: 같은 와이파이의 iPad에서 http://<PC IP>:5173 으로 접속 가능
  server: { host: true },
  preview: { host: true },
})
