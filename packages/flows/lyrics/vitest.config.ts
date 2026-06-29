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
                // HTTP route shells — thin Elysia wiring; logic lives in the
                // tested services. Covered by integration tests, not units.
                'src/**/routes.ts',
                'src/**/*.routes.ts',
                // Pure constants / config, no logic to exercise.
                'src/**/config.ts',
            ],
        },
    },
    resolve: {
        alias: {
            '@flows/core': path.resolve(__dirname, '../../core/src/index.ts'),
            '@flows/shared': path.resolve(__dirname, '../../shared/src/index.ts'),
            '@flows/spotify': path.resolve(__dirname, '../spotify/src/index.ts'),
        },
    },
});
