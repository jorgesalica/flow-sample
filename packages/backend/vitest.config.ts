import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: ['node_modules', 'tests'],
        },
    },
    resolve: {
        alias: {
            '@api': '/src/api',
            '@domain': '/src/domain',
            '@infra': '/src/infrastructure',
            '@app': '/src/application',
        },
    },
});
