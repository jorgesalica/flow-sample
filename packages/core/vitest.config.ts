import { defineConfig } from 'vitest/config';

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
        statements: 84,
        branches: 72,
        functions: 90,
        lines: 84,
      },
    },
  },
});
