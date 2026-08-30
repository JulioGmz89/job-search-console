import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The dev server proxies /api to the Fastify process so the SPA talks to one
 * origin in both dev and production. In production the same files are served by
 * Fastify itself from ui/dist, so there is no proxy and no second port.
 */
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4318, proxy: { '/api': 'http://127.0.0.1:4317' } },
  build: { outDir: 'dist', emptyOutDir: true },
});
