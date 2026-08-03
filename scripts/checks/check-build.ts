import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { mediaModels, models } from '../../src/data/models';
import { v03RunModelSlugs, v03SuiteCases } from '../../src/data/v03-suite';

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
if (htmlFiles.length < 60) errors.push(`Expected at least 60 HTML pages, found ${htmlFiles.length}`);

const routeFor = (file: string) => {
  const relative = path.relative(dist, file).replace(/\\/g, '/');
  return relative === 'index.html' ? '/' : `/${relative.replace(/index\.html$/, '')}`;
};
const routes = new Set(htmlFiles.map(routeFor));
const htmlByRoute = new Map<string, string>();

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const route = routeFor(file);
  htmlByRoute.set(route, html);
  if (!/<!doctype html>/i.test(html)) errors.push(`${route}: missing doctype`);
  if (!/<h1[\s>]/i.test(html)) errors.push(`${route}: missing h1`);
  if (!/<meta name="description" content="[^"]+"/i.test(html)) errors.push(`${route}: missing description`);
  if (!/<link rel="canonical" href="https:\/\/[^\"]+"/i.test(html)) errors.push(`${route}: missing canonical`);
  if (/sk-or-v1-|VENICE_INFERENCE_KEY_|github_pat_|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/.test(html)) errors.push(`${route}: secret-like token`);
  const hrefs = [...html.matchAll(/href="(\/[^\"]*)"/g)].map((match) => match[1]!.split(/[?#]/)[0]!);
  for (const href of hrefs) {
    if (href.startsWith('/_') || href.startsWith('/raw/') || href.includes('.')) continue;
    const normalized = href.endsWith('/') ? href : `${href}/`;
    if (!routes.has(normalized) && !routes.has(href)) errors.push(`${route}: unresolved internal href ${href}`);
  }
}

const home = htmlByRoute.get('/') || '';
if (!home.includes('33 tests.')) errors.push('/: missing v0.3 suite thesis');
if (!home.includes('163')) errors.push('/: missing live-run execution count');
if (!home.includes('published')) errors.push('/: missing published state');
if (!home.includes('Published ranks</dt><dd>18')) errors.push('/: expected 18 published models');
if (/v0\.2 reviewed baseline/i.test(home)) errors.push('/: old v0.2 baseline is still presented as current');

const suite = htmlByRoute.get('/suite/') || '';
const suiteCells = (suite.match(/<a[^>]+class="matrix-cell(?:\s|\")/g) || []).length;
if (suiteCells !== v03SuiteCases.length) errors.push(`/suite/: expected ${v03SuiteCases.length} matrix cells, found ${suiteCells}`);
for (const test of v03SuiteCases) {
  const route = `/suite/${test.slug}/`;
  const html = htmlByRoute.get(route);
  if (!html) { errors.push(`${route}: missing v0.3 case page`); continue; }
  if (!html.includes(test.id)) errors.push(`${route}: missing case ID`);
  const mustNoindex = test.adultFlagged || test.family === 'boundary-control';
  if (mustNoindex && !html.includes('noindex,follow')) errors.push(`${route}: sensitive/control case must be noindex`);
  if (!mustNoindex && html.includes('noindex,follow')) errors.push(`${route}: public lawful case should be indexable`);
  if (test.family === 'boundary-control' && !html.includes('Exact control withheld')) errors.push(`${route}: boundary control disclosure missing`);
}

for (const route of ['/results/', '/models/', '/review/', '/rankings/text/', '/rankings/image/', '/rankings/video/', '/rankings/audio/', '/archive/', '/archive/v02/', '/compare/', '/manual-review/', '/showcase/']) {
  const html = htmlByRoute.get(route) || '';
  if (!html) errors.push(`${route}: expected route missing`);
  else if (!html.includes('noindex,follow')) errors.push(`${route}: must be noindex`);
}
for (const route of ['/rankings/text/', '/rankings/image/', '/rankings/video/', '/rankings/audio/']) {
  const html = htmlByRoute.get(route) || '';
  if (!html.includes('Evidence published')) errors.push(`${route}: missing published evidence state`);
  if (/<td[^>]*>\s*\d+(?:\.\d+)?\s*<\/td>/.test(html)) errors.push(`${route}: current track leaks a score table`);
}
if (!(htmlByRoute.get('/archive/v02/text/') || '').includes('Archived v0.2 text leaderboard')) errors.push('/archive/v02/text/: missing retired leaderboard');

const modelProfiles = htmlFiles.filter((file) => file.includes(`${path.sep}models${path.sep}`) && !file.endsWith(`${path.sep}models${path.sep}index.html`));
const roster = [...models, ...mediaModels];
if (modelProfiles.length !== roster.length) errors.push(`Expected ${roster.length} model profiles, found ${modelProfiles.length}`);
for (const model of roster) {
  const route = `/models/${model.slug}/`;
  const html = htmlByRoute.get(route) || '';
  if (!html.includes('noindex,follow')) errors.push(`${route}: v0.3 model record must remain noindex`);
  const label = v03RunModelSlugs.has(model.slug) ? 'Live run · published' : 'Excluded · transport timeout';
  if (!html.includes(label)) errors.push(`${route}: missing ${label} state`);
  if (/Reviewed baseline · v0\.2/i.test(html)) errors.push(`${route}: old baseline leaked into current profile`);
}

const changelog = htmlByRoute.get('/research/benchmark-changelog/') || '';
if (!changelog.includes('Benchmark 0.3.0 (current protocol)')) errors.push('/research/benchmark-changelog/: missing current v0.3 release');
if (/v0\.3 \(planned\)/i.test(changelog)) errors.push('/research/benchmark-changelog/: still labels v0.3 as planned');

const jsBytes = (await Promise.all(files.filter((file) => file.endsWith('.js')).map(async (file) => (await stat(file)).size))).reduce((a, b) => a + b, 0);
if (jsBytes > 100_000) errors.push(`JavaScript budget exceeded: ${jsBytes} bytes`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`html_pages: ${htmlFiles.length}`);
console.log(`suite_cases: ${v03SuiteCases.length}`);
console.log(`model_profiles: ${modelProfiles.length}`);
console.log(`javascript_bytes: ${jsBytes}`);
console.log('build_checks: passed');
