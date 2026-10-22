import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'mediabunny': '/node_modules/mediabunny/dist/bundles/mediabunny.mjs',
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react', 'mediabunny'],
  },
  worker: {
    format: 'es',
  },
});
