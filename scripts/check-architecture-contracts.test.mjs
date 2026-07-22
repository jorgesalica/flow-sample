import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPackageDependencies, checkSource } from './check-architecture-contracts.mjs';

test('accepts code that follows the architecture boundaries', () => {
  const violations = checkSource(
    'packages/flows/trading/src/backend/services/example.ts',
    "import type { Track } from '@flows/shared';\nexport const value: unknown = {};",
  );
  assert.deepEqual(violations, []);
});

test('reports explicit any with an actionable location', () => {
  const violations = checkSource('packages/core/src/example.ts', 'const value = input as any;');
  assert.equal(violations[0]?.rule, 'no-explicit-any');
  assert.equal(violations[0]?.line, 1);
});

test('rejects hardcoded localhost origins in UI API modules', () => {
  const violations = checkSource(
    'packages/ui/src/lib/flows/chat/api.ts',
    "fetch('http://localhost:3000/api/chat')",
  );
  assert.equal(violations[0]?.rule, 'no-hardcoded-ui-origin');
});

test('rejects browser runtime imports from the CommonJS shared package', () => {
  const violations = checkSource(
    'packages/ui/src/lib/flows/chat/api.ts',
    "import { type ChatMessage } from '@flows/shared';",
  );
  assert.equal(violations[0]?.rule, 'ui-shared-types-only');
});

test('rejects unsafe double casts at production UI API and loader boundaries', () => {
  const lyricsViolations = checkSource(
    'packages/ui/src/lib/flows/lyrics/api.ts',
    'const result = data as unknown as LyricsStats;',
  );
  const tradingViolations = checkSource(
    'packages/ui/src/lib/flows/trading/api.ts',
    'const result = data as unknown as TradingStatus;',
  );
  const canvasLoaderViolations = checkSource(
    'packages/ui/src/routes/canvas/+page.ts',
    'return data as unknown as CanvasAnalysis[];',
  );
  assert.equal(lyricsViolations[0]?.rule, 'no-unsafe-api-casts');
  assert.equal(tradingViolations[0]?.rule, 'no-unsafe-api-casts');
  assert.equal(canvasLoaderViolations[0]?.rule, 'no-unsafe-api-casts');
});

test('rejects SQL calls outside persistence modules', () => {
  const violations = checkSource(
    'packages/flows/trading/src/backend/services/example.ts',
    "db.prepare('SELECT 1')",
  );
  assert.equal(violations[0]?.rule, 'sql-in-persistence-only');
});

test('rejects sibling flow imports', () => {
  const violations = checkSource(
    'packages/flows/chat/src/backend/routes.ts',
    "import { musicDb } from '@flows/spotify';",
  );
  assert.equal(violations[0]?.rule, 'no-sibling-flow-imports');
});

test('rejects the former lyrics to spotify persistence dependency', () => {
  const violations = checkSource(
    'packages/flows/lyrics/src/backend/repository.ts',
    "import { musicDb } from '@flows/spotify';",
  );
  assert.equal(violations[0]?.rule, 'no-sibling-flow-imports');
});

test('rejects flow dependencies on board application composition', () => {
  const violations = checkSource(
    'packages/flows/chat/src/backend/routes.ts',
    "import { createBoardRoutes } from '@flows/board';",
  );
  assert.equal(violations[0]?.rule, 'no-sibling-flow-imports');
});

test('rejects environment reads outside config factories', () => {
  const violations = checkSource(
    'packages/flows/trading/src/backend/services/example.ts',
    'const enabled = process.env.FEATURE_ENABLED;',
  );
  assert.equal(violations[0]?.rule, 'env-in-config-only');
});

test('allows environment reads in explicitly named config modules', () => {
  const violations = checkSource(
    'packages/flows/trading/src/backend/config.ts',
    'export const fromEnv = (env = process.env) => env.VALUE;',
  );
  assert.deepEqual(violations, []);
});

test('rejects legacy UI utilities and retired palette variables', () => {
  const violations = checkSource(
    'packages/ui/src/lib/example.svelte',
    '<div class="glass text-cosmic-400" style="color: var(--surface-100)"></div>',
  );
  assert.deepEqual(
    violations.map(({ rule }) => rule),
    ['no-legacy-ui-styles', 'no-legacy-ui-styles', 'no-legacy-ui-styles'],
  );
});

test('rejects gradients in production UI styles', () => {
  const violations = checkSource(
    'packages/ui/src/app.css',
    '.hero { background: linear-gradient(red, blue); }',
  );
  assert.equal(violations[0]?.rule, 'no-ui-gradients');
});

test('rejects Svelte accessibility suppressions', () => {
  const violations = checkSource(
    'packages/ui/src/lib/example.svelte',
    '<!-- svelte-ignore a11y_no_static_element_interactions -->',
  );
  assert.equal(violations[0]?.rule, 'no-a11y-suppression');
});

test('allows the neutral analysis dependency graph', () => {
  const violations = checkPackageDependencies('packages/analysis/package.json', {
    name: '@flows/analysis',
    dependencies: {
      '@flows/core': 'workspace:*',
      '@flows/shared': 'workspace:*',
    },
  });
  assert.deepEqual(violations, []);
});

test('rejects analysis capabilities leaking back into core', () => {
  const violations = checkPackageDependencies('packages/core/package.json', {
    name: '@flows/core',
    dependencies: { '@flows/analysis': 'workspace:*' },
  });
  assert.equal(violations[0]?.rule, 'workspace-dependency-boundary');
});

test('rejects analysis depending on flow orchestration', () => {
  const violations = checkPackageDependencies('packages/analysis/package.json', {
    name: '@flows/analysis',
    devDependencies: { '@flows/lyrics': 'workspace:*' },
  });
  assert.equal(violations[0]?.rule, 'workspace-dependency-boundary');
});
