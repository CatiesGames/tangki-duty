import { defineConfig } from 'vite';

// GitHub Pages project page 在子目錄 /tangki-duty/ 下；本地 dev 用 '/' 即可。
// 程式裡所有 public 資源路徑都經過 asset()（用 import.meta.env.BASE_URL），所以子目錄也載得到圖。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/tangki-duty/' : '/',
  server: {
    port: 5188,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
}));