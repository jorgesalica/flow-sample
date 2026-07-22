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
        'src/**/database.ts',
        'src/**/server.ts',
        // Pure constants / config, no logic to exercise.
        'src/**/config.ts',
      ],
      thresholds: {
        statements: 89,
        branches: 76,
        functions: 90,
        lines: 89,
      },
    },
  },
  resolve: {
    alias: {
      '@flows/analysis': path.resolve(__dirname, '../../analysis/src/index.ts'),
      '@flows/core': path.resolve(__dirname, '../../core/src/index.ts'),
      '@flows/music': path.resolve(__dirname, '../../music/src/index.ts'),
      '@flows/shared': path.resolve(__dirname, '../../shared/src/index.ts'),
    },
  },
});
