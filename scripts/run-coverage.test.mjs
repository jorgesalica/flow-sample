import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  aggregateCoverage,
  discoverCoveragePackages,
  formatCoverageSummary,
} from './run-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function metric(total, covered) {
  return { total, covered, skipped: 0, pct: Number(((covered / total) * 100).toFixed(2)) };
}

test('discovers every package that owns a coverage command', async () => {
  const packages = await discoverCoveragePackages(path.join(ROOT, 'packages'));

  assert.deepEqual(
    packages.map(({ name }) => name),
    [
      '@flows/analysis',
      '@flows/backend',
      '@flows/board',
      '@flows/canvas',
      '@flows/chat',
      '@flows/core',
      '@flows/lyrics',
      '@flows/music',
      '@flows/spotify',
      '@flows/trading',
      '@flows/ui',
    ],
  );
});

test('aggregates package counts before calculating percentages', () => {
  const rows = [
    {
      name: 'a',
      statements: metric(4, 3),
      branches: metric(2, 1),
      functions: metric(1, 1),
      lines: metric(4, 3),
    },
    {
      name: 'b',
      statements: metric(6, 6),
      branches: metric(3, 3),
      functions: metric(2, 1),
      lines: metric(6, 6),
    },
  ];

  const total = aggregateCoverage(rows);

  assert.equal(total.statements.pct, 90);
  assert.equal(total.branches.pct, 80);
  assert.equal(total.functions.pct, 66.67);
});

test('formats a stable package summary', () => {
  const row = {
    name: '@flows/chat',
    statements: metric(10, 9),
    branches: metric(10, 8),
    functions: metric(10, 7),
    lines: metric(10, 9),
  };

  assert.equal(
    formatCoverageSummary([row]),
    [
      'Package      Statements  Branches  Functions  Lines',
      '-----------  ----------  --------  ---------  -----',
      '@flows/chat      90.00%    80.00%     70.00%  90.00%',
    ].join('\n'),
  );
});
