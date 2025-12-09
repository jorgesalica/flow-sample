import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, './src/lib'),
      '@components': path.resolve(__dirname, './src/lib/components'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:4173',
      '/outputs': 'http://127.0.0.1:4173',
    },
  },
});
