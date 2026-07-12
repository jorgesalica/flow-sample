import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'build', 'coverage', 'dist']);
const markdownLinkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
const failures = [];

function collectMarkdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(path);
    return extname(entry.name).toLowerCase() === '.md' ? [path] : [];
  });
}

function normalizeTarget(rawTarget) {
  const unwrapped = rawTarget.trim().replace(/^<|>$/g, '');
  return decodeURIComponent(unwrapped.split(/\s+["']/)[0].split('#')[0]);
}

for (const file of collectMarkdownFiles(root)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(markdownLinkPattern)) {
    const rawTarget = match[1];
    if (/^(?:[a-z]+:|#)/i.test(rawTarget)) continue;
    const target = normalizeTarget(rawTarget);
    if (!target || existsSync(resolve(dirname(file), target))) continue;
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    failures.push(`${file.slice(root.length + 1)}:${line} -> ${rawTarget}`);
  }
}

if (failures.length > 0) {
  console.error('Broken local documentation links:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Documentation links OK');
}
