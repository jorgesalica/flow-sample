import { spawnSync } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_INDEX = './dist/index.js';
const DIST_TYPES = './dist/index.d.ts';
const IMPORT_SAFE_ENTRYPOINTS = [
  ['analysis', 'dist', 'index.js'],
  ['music', 'dist', 'index.js'],
  ['flows', 'spotify', 'dist', 'index.js'],
  ['flows', 'lyrics', 'dist', 'index.js'],
  ['flows', 'trading', 'dist', 'index.js'],
  ['flows', 'canvas', 'dist', 'index.js'],
  ['backend', 'dist', 'api', 'app.js'],
];

async function childPackageDirectories(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name));
}

async function runtimeManifestFiles(root) {
  const packagesDirectory = path.join(root, 'packages');
  const directPackages = await childPackageDirectories(packagesDirectory);
  const flowPackages = await childPackageDirectories(path.join(packagesDirectory, 'flows'));
  const packageDirectories = [...directPackages, ...flowPackages].filter(
    (directory) => path.basename(directory) !== 'flows',
  );

  return packageDirectories.map((directory) => path.join(directory, 'package.json'));
}

export function checkRuntimeManifest(manifest, file = 'package.json') {
  if (manifest.name === '@flows/ui') return [];

  const violations = [];
  if (typeof manifest.main !== 'string' || !manifest.main.startsWith('./dist/')) {
    violations.push(`${file}: main must resolve to compiled output under ./dist/.`);
  }

  if (manifest.name === '@flows/backend') return violations;

  if (manifest.main !== DIST_INDEX) {
    violations.push(`${file}: main must be ${DIST_INDEX}.`);
  }
  if (manifest.types !== DIST_TYPES) {
    violations.push(`${file}: types must be ${DIST_TYPES}.`);
  }

  const rootExport = manifest.exports?.['.'];
  if (
    typeof rootExport !== 'object' ||
    rootExport === null ||
    rootExport.types !== DIST_TYPES ||
    rootExport.require !== DIST_INDEX ||
    rootExport.default !== DIST_INDEX
  ) {
    violations.push(
      `${file}: exports[\".\"] must expose compiled types, require, and default entries.`,
    );
  }

  return violations;
}

export async function checkRuntimeManifests(root = ROOT) {
  const files = await runtimeManifestFiles(root);
  const violations = [];

  for (const file of files) {
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    const relativeFile = path.relative(root, file).replaceAll('\\', '/');
    violations.push(...checkRuntimeManifest(manifest, relativeFile));
  }

  return violations;
}

export async function smokeBuiltBackend(root = ROOT) {
  const entrypoint = path.join(root, 'packages', 'backend', 'dist', 'api', 'app.js');
  await access(entrypoint);

  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'flow-sample-runtime-'));
  const smokeScript = [
    'const backend = require(process.argv[1]);',
    "if (typeof backend.createApp !== 'function') throw new Error('createApp export is missing');",
  ].join(' ');

  try {
    const result = spawnSync(process.execPath, ['-e', smokeScript, entrypoint], {
      cwd: temporaryDirectory,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test' },
      timeout: 30_000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
      const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
      throw new Error(`Compiled backend import failed.${details ? `\n${details}` : ''}`);
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function assertSideEffectFreeImport(entrypoint) {
  await access(entrypoint);
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'flow-sample-import-safety-'));
  const importScript = 'require(process.argv[1]);';

  try {
    const result = spawnSync(process.execPath, ['-e', importScript, entrypoint], {
      cwd: temporaryDirectory,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test' },
      timeout: 30_000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
      const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
      throw new Error(`Package import failed.${details ? `\n${details}` : ''}`);
    }

    const createdEntries = await readdir(temporaryDirectory);
    if (createdEntries.length > 0) {
      throw new Error(`Package import created filesystem entries: ${createdEntries.join(', ')}`);
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function checkBuiltImportSafety(root = ROOT) {
  for (const segments of IMPORT_SAFE_ENTRYPOINTS) {
    await assertSideEffectFreeImport(path.join(root, 'packages', ...segments));
  }
}

async function main() {
  const violations = await checkRuntimeManifests();
  if (violations.length > 0) {
    console.error(`Runtime manifest contracts failed (${violations.length}):`);
    for (const item of violations) console.error(`- ${item}`);
    process.exitCode = 1;
    return;
  }

  console.log('Runtime manifest contracts passed.');
  if (process.argv.includes('--manifests-only')) return;

  await smokeBuiltBackend();
  console.log('Compiled backend import passed.');
  await checkBuiltImportSafety();
  console.log('Compiled package imports are side-effect free.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
