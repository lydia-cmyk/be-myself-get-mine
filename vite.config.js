import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/be-myself-get-mine/',
  plugins: [react()],
  build: { sourcemap: true }        // ← 추가 (에러 위치가 원본 코드로 보임)
})
