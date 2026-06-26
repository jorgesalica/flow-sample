import { defineConfig, coverageConfigDefaults } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

// Standalone Vitest config — uses the plain `svelte()` plugin (NOT sveltekit()),
// which is the supported way to unit-test Svelte 5 components under jsdom.
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, './src/lib'),
      '@components': path.resolve(__dirname, './src/lib/components'),
    },
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    include: ['src/**/*.test.ts', 'src/**/*.svelte.test.ts'],
    exclude: ['e2e/**/*', 'node_modules/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      // Exclude things with no unit-testable logic so the % reflects real logic:
      // the Eden client factory (network), SvelteKit route shells, type decls,
      // the toast re-export, and the test setup itself.
      exclude: [
        ...coverageConfigDefaults.exclude,
        'src/lib/client.ts',
        'src/lib/toast.ts',
        'src/routes/**/+layout.*',
        'src/routes/**/+error.*',
        'src/**/*.d.ts',
        'vitest-setup.ts',
        '.svelte-kit/**',
      ],
    },
  },
});
