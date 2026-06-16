import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  server: {
    port: 41004,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:42004',
        changeOrigin: true
      }
    }
  }
});
