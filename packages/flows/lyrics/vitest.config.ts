import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@flows/core': path.resolve(__dirname, '../../core/src/index.ts'),
            '@flows/shared': path.resolve(__dirname, '../../shared/src/index.ts'),
            '@flows/spotify': path.resolve(__dirname, '../spotify/src/index.ts'),
        },
    },
});
