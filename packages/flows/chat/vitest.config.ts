import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/index.ts',
        'src/**/*.types.ts',
        'src/**/types/**',
        'src/**/server.ts',
        // Pure constants / config, no logic to exercise.
        'src/**/config.ts',
      ],
      thresholds: {
        statements: 93,
        branches: 85,
        functions: 95,
        lines: 93,
      },
    },
  },
  resolve: {
    alias: {
      '@flows/core': path.resolve(__dirname, '../../core/src/index.ts'),
      '@flows/shared': path.resolve(__dirname, '../../shared/src/index.ts'),
    },
  },
});
