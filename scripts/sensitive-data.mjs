import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_EMAIL_DOMAINS = new Set([
  'concienc.ia',
  'example.com',
  'example.org',
  'mock.test',
  'test.com',
]);

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.example',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.svelte',
  '.ts',
  '.txt',
  '.yaml',
  '.yml',
]);

const EXCLUDED_FILES = new Set(['pnpm-lock.yaml', 'scripts/sensitive-data.test.mjs']);

const RULES = [
  {
    rule: 'secret-token',
    pattern:
      /\b(?:sk_(?:test|live)|pk_(?:test|live)|gh[opusr]_|AKIA|AIza|gsk_|csk-|sk-(?:proj-|or-v1-)?)[A-Za-z0-9_-]{12,}\b/g,
    validate: (match) => !/(?:dummy|example|placeholder|replace|your)[_-]/i.test(match[0]),
  },
  {
    rule: 'private-key',
    pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/g,
  },
  {
    rule: 'credential-url',
    pattern:
      /\b(?:mongodb(?:\+srv)?|mysql|postgres(?:ql)?|redis):\/\/([^:\s/]+):([^@\s/]+)@[^\s"'`]+/g,
    validate: (match) =>
      !(
        /^(?:demo|example|postgres|test|user|username)$/i.test(match[1]) &&
        /^(?:demo|example|password|postgres|test)$/i.test(match[2])
      ),
  },
  {
    rule: 'personal-email',
    pattern: /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
    validate: (match, _filePath, content) => {
      const prefix = content.slice(Math.max(0, (match.index ?? 0) - 30), match.index);
      return !prefix.includes('://') && !ALLOWED_EMAIL_DOMAINS.has(match[1].toLowerCase());
    },
  },
  {
    rule: 'dni',
    pattern: /\bdni\s*[:=]\s*['"]?(\d{7,8})['"]?/gi,
    validate: (match) => match[1] !== '12345678',
  },
];

function lineForOffset(content, offset) {
  return content.slice(0, offset).split('\n').length;
}

export function scanSensitiveContent(filePath, content) {
  const findings = [];

  for (const { rule, pattern, validate } of RULES) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      if (validate && !validate(match, filePath, content)) {
        continue;
      }

      findings.push({
        rule,
        filePath,
        line: lineForOffset(content, match.index ?? 0),
      });
    }
  }

  return findings;
}

export async function scanRepositoryFiles(root = process.cwd()) {
  const output = execFileSync(
    'git',
    [
      '-c',
      `safe.directory=${root}`,
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
    ],
    { cwd: root, encoding: 'utf8' },
  );
  const files = output.split('\0').filter(Boolean);
  const findings = [];

  for (const filePath of files) {
    if (
      EXCLUDED_FILES.has(filePath) ||
      filePath.startsWith('.knowledge-pool/') ||
      filePath.includes('/coverage/') ||
      filePath.includes('/dist/') ||
      !TEXT_EXTENSIONS.has(path.extname(filePath))
    ) {
      continue;
    }

    try {
      const content = await readFile(path.join(root, filePath), 'utf8');
      findings.push(...scanSensitiveContent(filePath, content));
    } catch {
      // A file may disappear between git enumeration and the read during local cleanup.
    }
  }

  return findings;
}

async function main() {
  const findings = await scanRepositoryFiles();
  if (findings.length === 0) {
    console.log('Sensitive-data scan passed.');
    return;
  }

  for (const finding of findings) {
    console.error(`${finding.filePath}:${finding.line} [${finding.rule}] sensitive value detected`);
  }
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
