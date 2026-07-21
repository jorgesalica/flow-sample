import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/backend/database.ts'],
      thresholds: {
        statements: 93,
        branches: 85,
        functions: 92,
        lines: 97,
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
