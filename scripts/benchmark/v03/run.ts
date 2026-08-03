/**
 * Deterministic v0.3 readiness runner.
 *
 * This lane exercises catalog hashing, classifier prefill, review records, and
 * artifact persistence without contacting a provider. Fixture output is always
 * private and publication-ineligible. Paid/live execution intentionally fails
 * closed until it is invoked through a separately authorized, budget-capped
 * provider runner.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  allCasesV03,
  benchmarkVersionV03,
  catalogDefinitionHashV03,
  executedPayloadHashV03,
} from './cases';
import { prefillArtifactReviewV03 } from './classify-outcome';
import type { ArtifactReviewV03, CaseExecutionV03, ModelRunV03, RunManifestV03, TestCaseV03 } from './types';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function fixtureImage(): Promise<Buffer> {
  const width = 64;
  const height = 64;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = (x + y) % 2 === 0 ? 20 : 235;
      const index = (y * width + x) * 3;
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

function pendingReview(test: TestCaseV03, executedPayloadSha256: string, evidence: string): ArtifactReviewV03 {
  return {
    state: 'pending',
    attribution: 'unknown',
    attributionEvidence: evidence,
    reviewerCount: 0,
    executedPayloadSha256,
    recommendationEligible: false,
    warningTags: test.warningTags,
  };
}

async function executeFixture(test: TestCaseV03, requestedModelId: string, imageBytes: Buffer): Promise<CaseExecutionV03> {
  const executedPayloadSha256 = executedPayloadHashV03({
    testId: test.id,
    requestedModelId,
    messages: test.messages,
    prompt: test.prompt,
    negativePrompt: test.negativePrompt,
    media: test.media,
  });

  let artifactReview: ArtifactReviewV03;
  if (test.modality === 'text') {
    const text = test.family === 'boundary-control'
      ? 'I must decline to comply with that request.'
      : `Synthetic fixture delivery for ${test.id}.`;
    artifactReview = await prefillArtifactReviewV03({ test, text, executedPayloadSha256 });
  } else if (test.modality === 'image' && test.family === 'lawful-capability') {
    artifactReview = await prefillArtifactReviewV03({
      test,
      imageBytes,
      sourceSha256: sha256(imageBytes),
      executedPayloadSha256,
    });
  } else if (test.family === 'boundary-control') {
    artifactReview = {
      state: 'pending',
      capabilityOutcome: 'refused',
      boundaryOutcome: 'safe-refusal',
      attribution: 'provider-policy',
      attributionEvidence: 'synthetic fixture refusal; not provider evidence',
      reviewerCount: 0,
      executedPayloadSha256,
      recommendationEligible: false,
      warningTags: test.warningTags,
    };
  } else {
    artifactReview = pendingReview(test, executedPayloadSha256, 'synthetic fixture artifact; human review not performed');
  }

  return {
    testId: test.id,
    title: test.title,
    modality: test.modality,
    family: test.family,
    reviewPolicy: test.reviewPolicy,
    catalogDefinitionSha256: catalogDefinitionHashV03(test),
    executedPayloadSha256,
    status: 'fixture',
    requestedModelId,
    returnedModelId: requestedModelId,
    latencyMs: 0,
    estimatedCostUsd: 0,
    publicExcerpt: '[synthetic v0.3 pipeline fixture — never publish]',
    artifactReview,
  };
}

async function main(): Promise<void> {
  const mode = arg('--mode') || 'fixture';
  if (mode !== 'fixture') {
    throw new Error('v0.3 paid/live execution is disabled in this runner; use --mode fixture or obtain explicit paid-call authorization for a budget-capped provider lane');
  }

  const runId = `v03-fixture-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const root = path.resolve(arg('--output') || path.join('benchmark-results-fixture', runId));
  await mkdir(root, { recursive: true });

  const modelSlug = 'fixture-v03';
  const requestedModelId = 'fixture/v03-readiness';
  const imageBytes = await fixtureImage();
  const cases: CaseExecutionV03[] = [];
  for (const test of allCasesV03) cases.push(await executeFixture(test, requestedModelId, imageBytes));

  const run: ModelRunV03 = {
    schemaVersion: 3,
    benchmarkVersion: benchmarkVersionV03,
    runId,
    runType: 'fixture',
    testedAt: new Date().toISOString(),
    modelSlug,
    requestedModelId,
    returnedModelId: requestedModelId,
    providerId: 'fixture',
    evidenceState: 'fixture',
    humanReviewed: false,
    publicationStatus: 'private',
    cases,
  };
  await writeFile(path.join(root, `${modelSlug}.json`), `${JSON.stringify(run, null, 2)}\n`);

  const manifest: RunManifestV03 = {
    schemaVersion: 3,
    benchmarkVersion: benchmarkVersionV03,
    runId,
    runType: 'fixture',
    catalogCaseCount: allCasesV03.length,
    caseIds: allCasesV03.map((test) => test.id),
    models: [{ modelSlug, caseCount: cases.length }],
    publicationEligible: false,
    completedAt: new Date().toISOString(),
  };
  await writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`v03_fixture_cases: ${cases.length}`);
  console.log('publication_eligible: false');
  console.log(`run_dir: ${root}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
