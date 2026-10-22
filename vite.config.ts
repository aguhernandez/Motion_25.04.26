import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Resolve from this config file, including in workers and deployment checkouts.
      'mediabunny': fileURLToPath(new URL('./node_modules/mediabunny/dist/bundles/mediabunny.mjs', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react', 'mediabunny'],
  },
  worker: {
    format: 'es',
  },
});
