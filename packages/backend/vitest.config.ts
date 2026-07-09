import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist/**', 'coverage/**'],
    },
  },
  resolve: {
    alias: {
      '@flows/canvas': path.resolve(__dirname, '../flows/canvas/src/index.ts'),
      '@flows/chat': path.resolve(__dirname, '../flows/chat/src/index.ts'),
      '@flows/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@flows/lyrics': path.resolve(__dirname, '../flows/lyrics/src/index.ts'),
      '@flows/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      '@flows/spotify': path.resolve(__dirname, '../flows/spotify/src/index.ts'),
      '@flows/trading': path.resolve(__dirname, '../flows/trading/src/index.ts'),
    },
  },
});
