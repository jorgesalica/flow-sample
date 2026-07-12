import assert from 'node:assert/strict';
import test from 'node:test';
import { checkSource } from './check-architecture-contracts.mjs';

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
  const violations = checkSource('packages/ui/src/lib/flows/chat/api.ts', "fetch('http://localhost:3000/api/chat')");
  assert.equal(violations[0]?.rule, 'no-hardcoded-ui-origin');
});

test('rejects SQL calls outside persistence modules', () => {
  const violations = checkSource('packages/flows/trading/src/backend/services/example.ts', "db.prepare('SELECT 1')");
  assert.equal(violations[0]?.rule, 'sql-in-persistence-only');
});

test('rejects sibling flow imports', () => {
  const violations = checkSource('packages/flows/chat/src/backend/routes.ts', "import { musicDb } from '@flows/spotify';");
  assert.equal(violations[0]?.rule, 'no-sibling-flow-imports');
});

test('rejects the former lyrics to spotify persistence dependency', () => {
  const violations = checkSource('packages/flows/lyrics/src/backend/repository.ts', "import { musicDb } from '@flows/spotify';");
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
