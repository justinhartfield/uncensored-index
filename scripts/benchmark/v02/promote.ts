/**
 * Promote a finalized, human-reviewed v0.2 run directory into the published site dataset.
 * Usage: npx tsx scripts/benchmark/v02/promote.ts --dir benchmark-results/<run-id>
 *
 * Gate (mirrors the §3e human-review step): every run must be a live run with
 * evidenceState 'live-reviewed', humanReviewed true, publicationStatus 'public',
 * and every manual-review case must carry humanScores.
 *
 * Output: src/data/public-results-v02.json — the committed, served v0.2 corpus.
 *   The run dir itself stays gitignored (private/provider metadata may live there in
 *   future runs); this promote step is the public-safe surfacing boundary.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ModelRunV02 } from './types';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('--dir required: npx tsx scripts/benchmark/v02/promote.ts --dir benchmark-results/<run-id>');
  const runDir = path.resolve(dir);
  const files = (await readdir(runDir)).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
  const runs: ModelRunV02[] = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(runDir, file), 'utf8')) as ModelRunV02;
    if (raw.runType !== 'live') throw new Error(`${file}: not a live run (${raw.runType})`);
    if (raw.evidenceState !== 'live-reviewed' || raw.humanReviewed !== true || raw.publicationStatus !== 'public')
      throw new Error(`${file}: missing completed human review (evidenceState=${raw.evidenceState} humanReviewed=${raw.humanReviewed} publicationStatus=${raw.publicationStatus})`);
    for (const c of raw.cases) {
      if (c.status === 'manual-review' && (!c.humanScores || Object.keys(c.humanScores).length === 0))
        throw new Error(`${file}/${c.testId}: manual-review with no humanScores`);
    }
    runs.push(raw);
  }
  if (!runs.length) throw new Error('no runs found');

  const results = runs.map((r) => ({
    modelSlug: r.modelSlug,
    displayName: r.modelSlug,
    runId: r.runId,
    runType: r.runType,
    requestedModelId: r.requestedModelId,
    returnedModelId: r.returnedModelId,
    providerId: r.providerId,
    evidenceState: r.evidenceState,
    humanReviewed: r.humanReviewed,
    testedAt: r.testedAt,
    trackScores: r.trackScores,
    cases: r.cases.map((c) => ({
      testId: c.testId,
      modality: c.modality,
      status: c.status,
      autoScore: c.autoScore,
      humanScores: c.humanScores,
      latencyMs: c.latencyMs,
      estimatedCostUsd: c.estimatedCostUsd,
      publicExcerpt: c.publicExcerpt,
      error: c.error,
      mediaMeta: c.mediaMeta,
    })),
  }));

  const output = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    benchmarkVersion: '0.2.0',
    results,
  };
  await writeFile('src/data/public-results-v02.json', JSON.stringify(output, null, 2));
  console.log(`promoted_v02: ${results.length} results, ${results.reduce((a, b) => a + b.cases.length, 0)} cases`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
