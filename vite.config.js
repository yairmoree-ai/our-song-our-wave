import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/home-together/',   // ← שנה לשם הריפו שלך ב-GitHub
})
