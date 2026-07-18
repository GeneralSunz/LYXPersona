import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 部署到 GitHub Pages 时通过环境变量设置 /仓库名/
// 例如 VITE_BASE_PATH=/my-repo/，本地开发使用默认 /
const base = process.env.VITE_BASE_PATH ? process.env.VITE_BASE_PATH : undefined

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
})
