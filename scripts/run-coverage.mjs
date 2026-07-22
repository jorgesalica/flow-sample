import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = path.join(ROOT, 'packages');
const IGNORED_DIRECTORIES = new Set(['coverage', 'dist', 'node_modules', '.svelte-kit']);
const METRICS = ['statements', 'branches', 'functions', 'lines'];

async function findPackageManifests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const manifests = [];

  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      manifests.push(...(await findPackageManifests(target)));
    } else if (entry.name === 'package.json') {
      manifests.push(target);
    }
  }

  return manifests;
}

export async function discoverCoveragePackages(packagesRoot = PACKAGES) {
  const manifests = await findPackageManifests(packagesRoot);
  const packages = [];

  for (const manifestPath of manifests) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const testScript = manifest.scripts?.test;
    const coverageScript = manifest.scripts?.['test:coverage'];

    if (typeof testScript === 'string' && testScript.includes('vitest') && !coverageScript) {
      throw new Error(
        `${manifest.name ?? manifestPath} runs Vitest but has no test:coverage script`,
      );
    }

    if (typeof coverageScript === 'string') {
      packages.push({
        name: manifest.name,
        directory: path.dirname(manifestPath),
      });
    }
  }

  return packages.sort((left, right) => left.name.localeCompare(right.name, 'en'));
}

function coverageCommand(packageDirectory) {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, '--dir', packageDirectory, 'run', 'test:coverage'],
      shell: false,
    };
  }

  return {
    command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    args: ['--dir', packageDirectory, 'run', 'test:coverage'],
    shell: process.platform === 'win32',
  };
}

function runPackageCoverage(packageInfo, root) {
  console.log(`\n## ${packageInfo.name}`);
  const invocation = coverageCommand(packageInfo.directory);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: root,
    env: process.env,
    shell: invocation.shell,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${packageInfo.name} coverage failed with exit code ${result.status ?? 'unknown'}`,
    );
  }
}

export async function readCoverageSummary(packageInfo) {
  const summaryPath = path.join(packageInfo.directory, 'coverage', 'coverage-summary.json');
  const report = JSON.parse(await readFile(summaryPath, 'utf8'));

  for (const metric of METRICS) {
    const value = report.total?.[metric];
    if (!value || !Number.isFinite(value.total) || !Number.isFinite(value.covered)) {
      throw new Error(`${packageInfo.name} has an invalid ${metric} coverage summary`);
    }
  }

  return { name: packageInfo.name, ...report.total };
}

export function aggregateCoverage(rows) {
  const total = { name: 'TOTAL' };

  for (const metric of METRICS) {
    const counts = rows.reduce(
      (result, row) => ({
        total: result.total + row[metric].total,
        covered: result.covered + row[metric].covered,
      }),
      { total: 0, covered: 0 },
    );
    total[metric] = {
      ...counts,
      skipped: 0,
      pct: counts.total === 0 ? 100 : Number(((counts.covered / counts.total) * 100).toFixed(2)),
    };
  }

  return total;
}

function metricLabel(metric) {
  return `${metric.pct.toFixed(2)}%`;
}

export function formatCoverageSummary(rows) {
  const columns = [
    ['Package', Math.max('Package'.length, ...rows.map((row) => row.name.length))],
    ['Statements', 'Statements'.length],
    ['Branches', 'Branches'.length],
    ['Functions', 'Functions'.length],
    ['Lines', 'Lines'.length],
  ];
  const header = columns
    .map(([label, width], index) => (index === 0 ? label.padEnd(width) : label.padStart(width)))
    .join('  ');
  const divider = columns.map(([, width]) => '-'.repeat(width)).join('  ');
  const body = rows.map((row) =>
    [
      row.name.padEnd(columns[0][1]),
      metricLabel(row.statements).padStart(columns[1][1]),
      metricLabel(row.branches).padStart(columns[2][1]),
      metricLabel(row.functions).padStart(columns[3][1]),
      metricLabel(row.lines).padStart(columns[4][1]),
    ].join('  '),
  );

  return [header, divider, ...body].join('\n');
}

async function main() {
  const packages = await discoverCoveragePackages();
  const summaries = [];

  for (const packageInfo of packages) {
    runPackageCoverage(packageInfo, ROOT);
    summaries.push(await readCoverageSummary(packageInfo));
  }

  const rows = [...summaries, aggregateCoverage(summaries)];
  console.log(`\nFull coverage summary (${summaries.length} packages)`);
  console.log(formatCoverageSummary(rows));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
