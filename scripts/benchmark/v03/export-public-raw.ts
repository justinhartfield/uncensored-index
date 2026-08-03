import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { allCasesV03 } from './cases';
import type { ModelRunV03 } from './types';

const runId = 'v03-live-2026-08-03T14-30-26-901Z';
const runDir = path.resolve('benchmark-results', runId);
const outputDir = path.resolve('public/raw/v03');
const metadataPath = path.resolve('src/data/v03-raw-artifacts.json');
const testById = new Map(allCasesV03.map((test) => [test.id, test]));
const forbiddenSecret = /sk-or-v1-|VENICE_INFERENCE_KEY_|github_pat_|Bearer\s+[A-Za-z0-9._-]{20,}/i;

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const files = (await readdir(runDir)).filter((file) => file.endsWith('.json') && file !== 'manifest.json').sort();
const artifacts: Array<Record<string, unknown>> = [];

for (const file of files) {
  const run = JSON.parse(await readFile(path.join(runDir, file), 'utf8')) as ModelRunV03;
  for (const result of run.cases) {
    const test = testById.get(result.testId);
    if (!test) throw new Error(`${run.modelSlug}/${result.testId}: test is absent from the frozen catalog`);
    if (result.family === 'boundary-control') continue;
    if (!result.artifact) throw new Error(`${run.modelSlug}/${result.testId}: lawful result has no retained artifact`);

    const source = path.join(runDir, result.artifact.privatePath);
    const bytes = await readFile(source);
    if (sha256(bytes) !== result.artifact.sourceSha256) throw new Error(`${run.modelSlug}/${result.testId}: source hash mismatch`);
    if (result.artifact.contentType === 'text/plain' && forbiddenSecret.test(bytes.toString('utf8'))) {
      throw new Error(`${run.modelSlug}/${result.testId}: secret-like content blocks raw publication`);
    }

    const extension = path.extname(source).toLowerCase();
    const relative = path.posix.join(run.modelSlug, `${result.testId}${extension}`);
    const destination = path.join(outputDir, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);

    artifacts.push({
      modelSlug: run.modelSlug,
      providerId: run.providerId,
      testId: result.testId,
      title: result.title,
      modality: result.modality,
      adultFlagged: test.adultFlagged,
      status: result.status,
      capabilityOutcome: result.artifactReview.capabilityOutcome,
      contentType: result.artifact.contentType,
      bytes: result.artifact.bytes,
      sourceSha256: result.artifact.sourceSha256,
      publicUrl: `/raw/v03/${relative}`,
      latencyMs: result.latencyMs,
      estimatedCostUsd: result.estimatedCostUsd,
    });
  }
}

if (artifacts.length !== 132) throw new Error(`expected 132 lawful artifacts, found ${artifacts.length}`);
await writeFile(metadataPath, `${JSON.stringify({ runId, exportedAt: '2026-08-03', artifacts }, null, 2)}\n`, 'utf8');

console.log(`raw_publication_artifacts: ${artifacts.length}`);
console.log(`raw_publication_models: ${new Set(artifacts.map((artifact) => artifact.modelSlug)).size}`);
console.log('raw_publication_boundary_artifacts: 0');
console.log(`raw_publication_metadata: ${path.relative(process.cwd(), metadataPath)}`);
