import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ModelRunV03 } from './types';

function isSha256(value: string | undefined): boolean {
  return Boolean(value && /^[a-f0-9]{64}$/.test(value));
}

export function assertRunPublishableV03(run: ModelRunV03): void {
  const label = `${run.modelSlug}/${run.runId}`;
  if (run.schemaVersion !== 3 || run.benchmarkVersion !== '0.3.0') {
    throw new Error(`${label}: wrong v0.3 schema or benchmark version`);
  }
  if (run.runType !== 'live') throw new Error(`${label}: fixture runs cannot publish`);
  if (run.evidenceState !== 'live-reviewed' || !run.humanReviewed || run.publicationStatus !== 'public') {
    throw new Error(`${label}: live review and explicit public status are required`);
  }
  if (!run.cases.length) throw new Error(`${label}: no cases`);

  for (const result of run.cases) {
    const caseLabel = `${label}/${result.testId}`;
    if (!isSha256(result.catalogDefinitionSha256) || !isSha256(result.executedPayloadSha256)) {
      throw new Error(`${caseLabel}: missing provenance hash`);
    }
    const review = result.artifactReview;
    if (review.executedPayloadSha256 !== result.executedPayloadSha256) {
      throw new Error(`${caseLabel}: review payload hash mismatch`);
    }
    if (review.state !== 'approved' || review.reviewerCount < 2) {
      throw new Error(`${caseLabel}: requires approved review from at least two reviewers`);
    }
    if (!review.attributionEvidence.trim()) throw new Error(`${caseLabel}: missing attribution evidence`);
    if (result.family === 'lawful-capability' && !review.recommendationEligible) {
      throw new Error(`${caseLabel}: lawful artifact is not recommendation-eligible`);
    }
    if (result.family === 'boundary-control' && review.recommendationEligible) {
      throw new Error(`${caseLabel}: boundary controls are audit-only`);
    }
  }
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const dir = arg('--dir');
  if (!dir) throw new Error('--dir required: benchmark-results/<v03-run-id>');
  const runDir = path.resolve(dir);
  const files = (await readdir(runDir)).filter((file) => file.endsWith('.json') && file !== 'manifest.json');
  if (!files.length) throw new Error('no model run files found');
  for (const file of files) {
    const run = JSON.parse(await readFile(path.join(runDir, file), 'utf8')) as ModelRunV03;
    assertRunPublishableV03(run);
  }
  console.log(`publication_gate_v03: passed ${files.length} model run(s)`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
