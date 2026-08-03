import { readFile, readdir, stat } from 'node:fs/promises';
import { mediaModels, models } from '../../src/data/models';
import { isPublishedV02, resultBySlugV02 } from '../../src/lib/results-v02';
import path from 'node:path';

const dist = path.resolve('dist');
async function allFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await allFiles(full));
    else files.push(full);
  }
  return files;
}
const files = await allFiles(dist);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const errors: string[] = [];
if (htmlFiles.length < 30) errors.push(`Expected at least 30 HTML pages, found ${htmlFiles.length}`);

const routeFor = (file: string) => {
  const relative = path.relative(dist, file).replace(/\\/g, '/');
  return relative === 'index.html' ? '/' : `/${relative.replace(/index\.html$/, '')}`;
};
const routes = new Set(htmlFiles.map(routeFor));
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const route = routeFor(file);
  if (!/<!doctype html>/i.test(html)) errors.push(`${route}: missing doctype`);
  if (!/<h1[\s>]/i.test(html)) errors.push(`${route}: missing h1`);
  if (!/<meta name="description" content="[^"]+"/i.test(html)) errors.push(`${route}: missing description`);
  if (!/<link rel="canonical" href="https:\/\/[^"]+"/i.test(html)) errors.push(`${route}: missing canonical`);
  if (/sk-or-v1-|github_pat_|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/.test(html)) errors.push(`${route}: secret-like token`);
  if (route === '/') {
    if (!html.includes('benchmark 0.3.0 · protocol live')) errors.push('/: missing active v0.3 protocol label');
    if (!html.includes('v0.2 reviewed baseline')) errors.push('/: missing reviewed v0.2 baseline disclosure');
  }
  if (route === '/research/benchmark-changelog/') {
    if (!html.includes('Benchmark 0.3.0 (current protocol)')) errors.push(`${route}: missing current v0.3 release`);
    if (/v0\.3 \(planned\)/i.test(html)) errors.push(`${route}: still labels v0.3 as planned`);
  }
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]!.split(/[?#]/)[0]!);
  for (const href of hrefs) {
    if (href.startsWith('/_') || href.includes('.')) continue;
    const normalized = href.endsWith('/') ? href : `${href}/`;
    if (!routes.has(normalized) && !routes.has(href)) errors.push(`${route}: unresolved internal href ${href}`);
  }
}
const modelProfiles = htmlFiles.filter((file) => file.includes(`${path.sep}models${path.sep}`) && !file.endsWith(`${path.sep}models${path.sep}index.html`));
const roster = [...models, ...mediaModels];
if (modelProfiles.length !== roster.length) errors.push(`Expected ${roster.length} model profiles, found ${modelProfiles.length}`);
const publishedSlugs = new Set(roster.filter((m) => isPublishedV02(resultBySlugV02(m.slug))).map((m) => m.slug));
for (const file of modelProfiles) {
  const html = await readFile(file, 'utf8');
  const rel = routeFor(file); // e.g. /models/aion-3-0/
  const slug = rel.replace(/^\/models\//, '').replace(/\/$/, '');
  if (publishedSlugs.has(slug)) {
    if (html.includes('noindex,follow')) errors.push(`${routeFor(file)}: published profile must be indexable`);
    if (!html.includes('Reviewed baseline')) errors.push(`${routeFor(file)}: published profile missing reviewed-baseline label`);
  } else {
    if (!html.includes('noindex,follow')) errors.push(`${routeFor(file)}: pending model profile must be noindex`);
    if (!html.includes('Awaiting v0.3 review')) errors.push(`${routeFor(file)}: missing v0.3 evidence label`);
  }
}
const jsBytes = (await Promise.all(files.filter((file) => file.endsWith('.js')).map(async (file) => (await stat(file)).size))).reduce((a, b) => a + b, 0);
if (jsBytes > 100_000) errors.push(`JavaScript budget exceeded: ${jsBytes} bytes`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`html_pages: ${htmlFiles.length}`);
console.log(`model_profiles: ${modelProfiles.length}`);
console.log(`javascript_bytes: ${jsBytes}`);
console.log('build_checks: passed');
