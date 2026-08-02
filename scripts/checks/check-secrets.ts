import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const excluded = new Set(['node_modules', '.git', '.astro', 'playwright-report', 'test-results', 'benchmark-private', 'benchmark-results']);
const excludedFiles = new Set(['.env', 'package-lock.json']);
const textExtensions = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.astro', '.css', '.md', '.html', '.xml', '.txt', '.svg', '.yml', '.yaml', '.example']);
const patterns = [
  { name: 'OpenRouter key', pattern: /sk-or-v1-[A-Za-z0-9_-]{20,}/g },
  { name: 'generic secret key', pattern: /\bsk-(?:live|test|proj|ant|[A-Za-z0-9]+)[A-Za-z0-9_-]{20,}/g },
  { name: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{30,}/g },
  { name: 'GitHub token', pattern: /(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/g },
  { name: 'JWT', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'Bearer token', pattern: /Bearer\s+[A-Za-z0-9._-]{20,}/g },
];

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (excluded.has(entry.name) || excludedFiles.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(full));
    else if (textExtensions.has(path.extname(entry.name)) || entry.name === '.env.example') files.push(full);
  }
  return files;
}

const leaks: string[] = [];
const files = await filesIn(root);
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const { name, pattern } of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) leaks.push(`${path.relative(root, file)}: ${name}`);
  }
}
if (leaks.length) {
  console.error(leaks.join('\n'));
  process.exit(1);
}
console.log(`secret_scan_files: ${files.length}`);
console.log('credential_leaks: 0');
