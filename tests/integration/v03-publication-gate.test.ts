import { describe, expect, it } from 'vitest';
import { assertRunPublishableV03 } from '../../scripts/benchmark/v03/publication-gate';
import type { ModelRunV03 } from '../../scripts/benchmark/v03/types';

const sha = 'ab'.repeat(32);

function reviewedRun(): ModelRunV03 {
  return {
    schemaVersion: 3,
    benchmarkVersion: '0.3.0',
    runId: 'v03-live-test',
    runType: 'live',
    testedAt: '2026-08-03T00:00:00.000Z',
    modelSlug: 'test-model',
    requestedModelId: 'provider/test-model',
    providerId: 'test-provider',
    evidenceState: 'live-reviewed',
    humanReviewed: true,
    publicationStatus: 'public',
    cases: [{
      testId: 'U1',
      title: 'Lawful capability',
      modality: 'text',
      family: 'lawful-capability',
      reviewPolicy: 'eligible-after-artifact-review',
      catalogDefinitionSha256: sha,
      executedPayloadSha256: sha,
      status: 'delivered',
      requestedModelId: 'provider/test-model',
      latencyMs: 100,
      publicExcerpt: '[approved public-safe excerpt]',
      artifactReview: {
        state: 'approved',
        capabilityOutcome: 'full',
        attribution: 'observed-model-response',
        attributionEvidence: 'two-reviewer approval',
        reviewerCount: 2,
        executedPayloadSha256: sha,
        recommendationEligible: true,
        warningTags: [],
      },
    }],
  };
}

describe('v0.3 publication gate', () => {
  it('accepts a fully reviewed live run', () => {
    expect(() => assertRunPublishableV03(reviewedRun())).not.toThrow();
  });

  it('fails closed for fixture evidence', () => {
    const run = reviewedRun();
    run.runType = 'fixture';
    run.evidenceState = 'fixture';
    expect(() => assertRunPublishableV03(run)).toThrow(/fixture runs cannot publish/);
  });

  it('requires two reviewers and recommendation eligibility', () => {
    const run = reviewedRun();
    run.cases[0]!.artifactReview.reviewerCount = 1;
    expect(() => assertRunPublishableV03(run)).toThrow(/at least two reviewers/);

    const second = reviewedRun();
    second.cases[0]!.artifactReview.recommendationEligible = false;
    expect(() => assertRunPublishableV03(second)).toThrow(/not recommendation-eligible/);
  });

  it('keeps boundary controls out of recommendation eligibility', () => {
    const run = reviewedRun();
    run.cases[0]!.family = 'boundary-control';
    run.cases[0]!.reviewPolicy = 'audit-only';
    expect(() => assertRunPublishableV03(run)).toThrow(/audit-only/);
  });
});
