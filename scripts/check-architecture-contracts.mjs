import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = path.join(ROOT, 'packages');
const SOURCE_EXTENSIONS = new Set(['.css', '.ts', '.svelte']);
const IGNORED_PARTS = new Set([
  '.svelte-kit',
  'dist',
  'node_modules',
  'coverage',
  'tests',
  '__fixtures__',
  '__stubs__',
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
  const legacyUiUtility = /\b(?:glass|(?:text|bg|border|shadow)-(?:cosmic|aurora|pulsar|nebula|stardust|void)(?:-[\w/]+)?)\b/g;
  const legacyUiVariable = /var\(--(?:surface|primary|secondary)-\d+\)/g;
  const uiGradient = /(?:linear|radial|conic)-gradient\s*\(/g;
  const accessibilitySuppression = /svelte-ignore\s+a11y_/g;
  const uiSharedRuntimeImport = /^\s*import\s+(?!type\b)[^;]+from\s+['"]@flows\/shared['"];?/gm;
  const unsafeDoubleCast = /\bas\s+unknown\s+as\b/g;

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
  if (flowMatch) {
    for (const match of source.matchAll(flowImport)) {
      if (match[1] !== flowMatch[1]) {
        violations.push(violation(file, source, match, 'no-sibling-flow-imports', 'Depend on @flows/shared, @flows/core, @flows/music, or an injected port instead.'));
      }
    }
  }

  const isEnvOwner = /(?:config|env|logger)\.ts$/.test(file) || file.endsWith('/playwright.config.ts');
  if (!isEnvOwner) {
    for (const match of source.matchAll(processEnv)) {
      violations.push(violation(file, source, match, 'env-in-config-only', 'Read environment variables in an explicitly named config/env factory and inject the result.'));
    }
  }

  if (file.startsWith('packages/ui/src/')) {
    for (const match of source.matchAll(uiSharedRuntimeImport)) {
      violations.push(violation(file, source, match, 'ui-shared-types-only', 'Use `import type` because @flows/shared is not a browser runtime package.'));
    }
    for (const match of source.matchAll(legacyUiUtility)) {
      violations.push(violation(file, source, match, 'no-legacy-ui-styles', 'Use shared primitives and semantic `--ui-*` tokens.'));
    }
    for (const match of source.matchAll(legacyUiVariable)) {
      violations.push(violation(file, source, match, 'no-legacy-ui-styles', 'Replace retired palette variables with semantic `--ui-*` tokens.'));
    }
    for (const match of source.matchAll(uiGradient)) {
      violations.push(violation(file, source, match, 'no-ui-gradients', 'Use a solid semantic surface or accent token.'));
    }
    for (const match of source.matchAll(accessibilitySuppression)) {
      violations.push(violation(file, source, match, 'no-a11y-suppression', 'Fix the control semantics instead of suppressing the Svelte accessibility warning.'));
    }

    const isUiApiBoundary =
      /\/(?:[^/]*api|client)\.ts$/.test(file) ||
      /\/routes\/(?:.*\/)?\+(?:page|layout)(?:\.server)?\.ts$/.test(file);
    if (isUiApiBoundary) {
      for (const match of source.matchAll(unsafeDoubleCast)) {
        violations.push(violation(file, source, match, 'no-unsafe-api-casts', 'Use Eden inference or a validated runtime mapper.'));
      }
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
