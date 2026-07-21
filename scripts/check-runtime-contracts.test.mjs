import assert from 'node:assert/strict';
import test from 'node:test';
import { checkRuntimeManifest } from './check-runtime-contracts.mjs';

const validPackage = {
  name: '@flows/example',
  main: './dist/index.js',
  types: './dist/index.d.ts',
  exports: {
    '.': {
      types: './dist/index.d.ts',
      require: './dist/index.js',
      default: './dist/index.js',
    },
  },
};

test('accepts a compiled workspace package contract', () => {
  assert.deepEqual(checkRuntimeManifest(validPackage, 'packages/example/package.json'), []);
});

test('rejects TypeScript source as a runtime package entrypoint', () => {
  const violations = checkRuntimeManifest(
    { ...validPackage, main: './src/index.ts' },
    'packages/example/package.json',
  );

  assert.match(violations[0], /compiled output/);
  assert.match(violations[1], /main must be/);
});

test('requires public types and exports for reusable workspace packages', () => {
  const violations = checkRuntimeManifest(
    { name: '@flows/example', main: './dist/index.js' },
    'packages/example/package.json',
  );

  assert.deepEqual(
    violations.map((item) => item.split(': ').at(-1)),
    [
      'types must be ./dist/index.d.ts.',
      'exports[\".\"] must expose compiled types, require, and default entries.',
    ],
  );
});

test('allows the backend host to omit a reusable package export contract', () => {
  assert.deepEqual(
    checkRuntimeManifest(
      { name: '@flows/backend', main: './dist/api/app.js' },
      'packages/backend/package.json',
    ),
    [],
  );
});

test('ignores the browser application package', () => {
  assert.deepEqual(checkRuntimeManifest({ name: '@flows/ui' }, 'packages/ui/package.json'), []);
});
