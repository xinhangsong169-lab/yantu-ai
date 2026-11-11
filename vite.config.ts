import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4320',
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0
      }
    }
  },
  build: { outDir: 'dist', sourcemap: false }
});
