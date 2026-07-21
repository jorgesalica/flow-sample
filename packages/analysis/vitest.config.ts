import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        statements: 100,
        branches: 75,
        functions: 100,
        lines: 100,
      },
    },
  },
  resolve: {
    alias: {
      '@flows/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@flows/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
