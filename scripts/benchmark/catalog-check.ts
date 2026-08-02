import { loadEnvFile } from 'node:process';
import { models } from '../../src/data/models';

try { loadEnvFile('.env'); } catch { /* optional */ }
const openRouterOnly = process.argv.includes('--openrouter-only');

async function getJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json() as Promise<any>;
}

const openRouterData = await getJson('https://openrouter.ai/api/v1/models');
const openRouterIds = new Set((openRouterData.data || []).map((item: any) => item.id));
const expectedOpenRouter = models.filter((model) => model.routeType === 'openrouter').map((model) => model.canonicalId);
const missingOpenRouter = expectedOpenRouter.filter((id) => !openRouterIds.has(id));
console.log(`openrouter_expected: ${expectedOpenRouter.length}`);
console.log(`openrouter_missing: ${missingOpenRouter.length}`);
if (missingOpenRouter.length) console.error(missingOpenRouter.join('\n'));

let missingVenice: string[] = [];
if (!openRouterOnly) {
  const key = process.env.VENICE_API_KEY?.trim();
  if (!key) throw new Error('VENICE_API_KEY is required for the full provider catalog gate');
  const veniceData = await getJson('https://api.venice.ai/api/v1/models', { Authorization: `Bearer ${key}` });
  const items = Array.isArray(veniceData.data) ? veniceData.data : Array.isArray(veniceData) ? veniceData : [];
  const veniceIds = new Set(items.map((item: any) => item.id));
  const expectedVenice = models.filter((model) => model.routeType === 'venice').map((model) => model.canonicalId);
  missingVenice = expectedVenice.filter((id) => !veniceIds.has(id));
  console.log(`venice_expected: ${expectedVenice.length}`);
  console.log(`venice_missing: ${missingVenice.length}`);
  if (missingVenice.length) console.error(missingVenice.join('\n'));
}
if (missingOpenRouter.length || missingVenice.length) process.exitCode = 1;
else console.log('catalog_gate: passed');
