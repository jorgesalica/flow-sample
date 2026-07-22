import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readText = (filePath) => readFile(filePath, 'utf8');
const readJson = async (filePath) => JSON.parse(await readText(filePath));

test('defines one complete local verification contract', async () => {
  const [rootPackage, uiPackage] = await Promise.all([
    readJson('package.json'),
    readJson('packages/ui/package.json'),
  ]);
  const { scripts } = rootPackage;

  for (const command of [
    'pnpm check:docs',
    'pnpm check:architecture',
    'pnpm check:runtime:manifests',
    'pnpm test:sensitive',
    'pnpm format:check',
    'pnpm lint',
    'pnpm typecheck',
    'pnpm check',
    'pnpm test',
  ]) {
    assert.ok(scripts.verify.includes(command), `verify must run "${command}"`);
  }

  assert.equal(scripts.format, 'prettier --write .');
  assert.equal(scripts['format:check'], 'prettier --check .');
  assert.equal(
    scripts['test:sensitive'],
    'node --test scripts/sensitive-data.test.mjs && node scripts/sensitive-data.mjs',
  );
  assert.match(scripts['test:tooling'], /pnpm run test:quality-tooling/);
  assert.match(scripts['clean:build'], /"dist"/);
  assert.match(scripts['clean:artifacts'], /"coverage"/);
  assert.equal(
    uiPackage.scripts.check,
    'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
  );
});

test('keeps CI aligned with local, coverage, security, and browser gates', async () => {
  const [workflow, playwrightConfig] = await Promise.all([
    readText('.github/workflows/ci.yml'),
    readText('packages/ui/playwright.config.ts'),
  ]);

  for (const command of [
    'pnpm security:audit',
    'pnpm build',
    'pnpm verify',
    'pnpm test:coverage',
    'pnpm --filter @flows/ui exec playwright install --with-deps chromium',
    'pnpm --filter @flows/ui test:e2e',
  ]) {
    assert.ok(workflow.includes(`run: ${command}`), `CI must run "${command}"`);
  }

  assert.match(workflow, /quality:\s/);
  assert.match(workflow, /e2e:\s/);
  assert.match(workflow, /actions\/checkout@v7/);
  assert.match(workflow, /pnpm\/action-setup@v6/);
  assert.match(workflow, /actions\/setup-node@v7/);
  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(playwrightConfig, /fullyParallel:\s*false/);
  assert.match(playwrightConfig, /retries:\s*0/);
  assert.match(playwrightConfig, /workers:\s*1/);
});

test('keeps PR QA and protected-branch guidance executable', async () => {
  const [template, preCommit, prePush] = await Promise.all([
    readText('.github/pull_request_template.md'),
    readText('.husky/pre-commit'),
    readText('.husky/pre-push'),
  ]);

  for (const heading of [
    '## What',
    '## Why',
    '## User impact',
    '## How to test',
    '## Meaningful QA',
    '## Breaking changes',
  ]) {
    assert.ok(template.includes(heading), `PR template must include "${heading}"`);
  }

  assert.match(preCommit, /ALLOW_PROTECTED_COMMIT/);
  assert.match(preCommit, /"main"/);
  assert.match(prePush, /ALLOW_PROTECTED_PUSH/);
  assert.match(prePush, /refs\/heads\/main/);
  assert.match(prePush, /packages\/backend\/dist\/api\/app\.js/);
  assert.match(prePush, /pnpm build before pushing/);
});

test('keeps unplanned dependency majors out of automated PRs', async () => {
  const dependabot = await readText('.github/dependabot.yml');

  assert.match(dependabot, /dependency-name:\s*['"]\*['"]/);
  assert.match(dependabot, /version-update:semver-major/);
});
