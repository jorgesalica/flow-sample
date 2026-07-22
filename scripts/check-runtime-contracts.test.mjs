import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertSideEffectFreeImport, checkRuntimeManifest } from './check-runtime-contracts.mjs';

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

test('accepts an import that leaves its working directory untouched', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'runtime-contract-test-'));
  const entrypoint = path.join(directory, 'safe.cjs');
  await writeFile(entrypoint, 'module.exports = { ok: true };');

  try {
    await assertSideEffectFreeImport(entrypoint);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects an import that writes to its working directory', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'runtime-contract-test-'));
  const entrypoint = path.join(directory, 'unsafe.cjs');
  await writeFile(entrypoint, "require('node:fs').writeFileSync('created.db', 'side effect');");

  try {
    await assert.rejects(
      assertSideEffectFreeImport(entrypoint),
      /created filesystem entries: created.db/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
