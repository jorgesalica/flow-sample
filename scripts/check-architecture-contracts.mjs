import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = path.join(ROOT, 'packages');
const SOURCE_EXTENSIONS = new Set(['.ts', '.svelte']);
const IGNORED_PARTS = new Set([
  '.svelte-kit',
  'dist',
  'node_modules',
  'coverage',
  'tests',
  '__fixtures__',
  '__stubs__',
]);

const FLOW_IMPORT_EXCEPTIONS = new Set([
  'packages/flows/lyrics/src/backend/routes.ts',
  'packages/flows/lyrics/src/backend/repository.ts',
  'packages/flows/lyrics/src/backend/canvas/repository.ts',
]);

function normalize(file) {
  return path.relative(ROOT, file).replaceAll('\\', '/');
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORED_PARTS.has(entry.name) || entry.name.endsWith('.test.ts')) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(target));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(target);
  }

  return files;
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function violation(file, source, match, rule, message) {
  return { file, line: lineNumber(source, match.index), rule, message };
}

export function checkSource(file, source) {
  const violations = [];
  const explicitAny = /\bas\s+any\b|:\s*any\b|<any>/g;
  const hardcodedOrigin = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/g;
  const sqlCall = /\.(?:prepare|exec)\s*\(/g;
  const flowImport = /from\s+['"]@flows\/(spotify|lyrics|trading|chat|canvas)(?:\/[^'"]*)?['"]/g;
  const processEnv = /process\.env/g;

  for (const match of source.matchAll(explicitAny)) {
    violations.push(violation(file, source, match, 'no-explicit-any', 'Replace `any` with a concrete type or safe narrowing.'));
  }

  const isUiApi = file.startsWith('packages/ui/src/') && (file.endsWith('/api.ts') || file.endsWith('/client.ts'));
  if (isUiApi) {
    for (const match of source.matchAll(hardcodedOrigin)) {
      violations.push(violation(file, source, match, 'no-hardcoded-ui-origin', 'Use a relative API path or the shared Eden client.'));
    }
  }

  const isPersistenceFile = /(?:repository|database)\.ts$/.test(file);
  if (!isPersistenceFile) {
    for (const match of source.matchAll(sqlCall)) {
      violations.push(violation(file, source, match, 'sql-in-persistence-only', 'Move SQL calls to a repository.ts or database.ts module.'));
    }
  }

  const flowMatch = file.match(/^packages\/flows\/([^/]+)\/src\//);
  if (flowMatch && !FLOW_IMPORT_EXCEPTIONS.has(file)) {
    for (const match of source.matchAll(flowImport)) {
      if (match[1] !== flowMatch[1]) {
        violations.push(violation(file, source, match, 'no-sibling-flow-imports', 'Depend on @flows/shared, @flows/core, or an injected port instead.'));
      }
    }
  }

  const isEnvOwner = /(?:config|env|logger)\.ts$/.test(file) || file.endsWith('/playwright.config.ts');
  if (!isEnvOwner) {
    for (const match of source.matchAll(processEnv)) {
      violations.push(violation(file, source, match, 'env-in-config-only', 'Read environment variables in an explicitly named config/env factory and inject the result.'));
    }
  }

  return violations;
}

export async function checkArchitecture() {
  const files = await sourceFiles(PACKAGES);
  const violations = [];
  for (const absoluteFile of files) {
    const file = normalize(absoluteFile);
    const source = await readFile(absoluteFile, 'utf8');
    violations.push(...checkSource(file, source));
  }
  return violations;
}

async function main() {
  const violations = await checkArchitecture();
  if (violations.length === 0) {
    console.log('Architecture contracts passed.');
    return;
  }
  console.error(`Architecture contracts failed (${violations.length} violation${violations.length === 1 ? '' : 's'}):`);
  for (const item of violations) {
    console.error(`- ${item.file}:${item.line} [${item.rule}] ${item.message}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
