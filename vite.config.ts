import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages serves this repo at /abyssal-module-tumbler/. The dev server stays at /.
const pagesBase = '/abyssal-module-tumbler/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? pagesBase : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    proxy: {
      '/api/mutamarket': {
        target: 'https://mutamarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mutamarket/, ''),
      },
      '/api/esi': {
        target: 'https://esi.evetech.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/esi/, ''),
      },
    },
    allowedHosts: [
        "dumpling.lafu.local"
    ]
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
}));
