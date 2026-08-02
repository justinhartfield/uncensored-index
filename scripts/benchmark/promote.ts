import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PublicBenchmarkResultSchema } from '../../src/lib/schemas';

const runArg = process.argv[process.argv.indexOf('--run') + 1];
if (!runArg || runArg === process.argv[0]) throw new Error('Usage: npm run benchmark:promote -- --run benchmark-results/<run-id>');
const runDir = path.resolve(runArg);
const files = (await readdir(runDir)).filter((name) => name.endsWith('.json') && name !== 'manifest.json');
const results = [];
for (const file of files) {
  const raw = JSON.parse(await readFile(path.join(runDir, file), 'utf8'));
  if (raw.runType !== 'live') throw new Error(`${file} is not a live run`);
  if (raw.publicationStatus !== 'reviewed' || raw.humanReviewed !== true) throw new Error(`${file} lacks completed human review`);
  const publicResult = {
    schemaVersion: 1,
    benchmarkVersion: raw.benchmarkVersion,
    runId: raw.runId,
    runType: 'live',
    testedAt: raw.testedAt,
    modelSlug: raw.modelSlug,
    requestedModelId: raw.requestedModelId,
    returnedModelId: raw.returnedModelId,
    providerId: raw.providerId,
    evidenceState: 'live-reviewed',
    testCount: raw.cases.length,
    cases: raw.cases.map(({ privateOutput, providerMetadata, ...item }: Record<string, unknown>) => item),
    automatedScores: raw.automatedScores || {},
    humanReviewed: true,
    overallScore: raw.overallScore,
  };
  results.push(PublicBenchmarkResultSchema.parse(publicResult));
}
const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), benchmarkVersion: results[0]?.benchmarkVersion || 'unknown', results };
await writeFile('src/data/public-results.json', JSON.stringify(output, null, 2));
console.log(`promoted_results: ${results.length}`);
