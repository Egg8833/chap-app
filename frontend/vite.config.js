import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import removeConsole from 'vite-plugin-remove-console'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 生產環境移除 console.log
    // removeConsole()
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // 啟用壓縮
    minify: 'terser',    terserOptions: {
      compress: {
        // 移除 console
        // drop_console: true,
        // drop_debugger: true,
        // 移除未使用的程式碼
        dead_code: true
      },
      mangle: {
        // 保留類別名稱以便調試
        keep_classnames: true
      },
      format: {
        // 移除註解
        comments: false
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // 程式碼分割優化
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'react-hot-toast'],
          utils: ['axios', 'socket.io-client', 'zustand']
        }
      }
    },
  },
  // 添加基礎路徑設定，在開發和生產環境都使用根路徑
  base: '/',
})
