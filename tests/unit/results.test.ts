import { describe, expect, it } from 'vitest';
import { evidenceLabel, isIndexableResult } from '../../src/lib/results';
import type { PublicBenchmarkResult } from '../../src/lib/schemas';

const base: PublicBenchmarkResult = {
  schemaVersion: 1, benchmarkVersion: '1.0', runId: 'run', runType: 'live', testedAt: new Date().toISOString(), modelSlug: 'test', requestedModelId: 'test', providerId: 'test', evidenceState: 'live-reviewed', testCount: 0, cases: [], automatedScores: {}, humanReviewed: true,
};

describe('evidence gates', () => {
  it('indexes only live reviewed results', () => {
    expect(isIndexableResult(base)).toBe(true);
    expect(isIndexableResult({ ...base, runType: 'fixture', evidenceState: 'fixture' })).toBe(false);
    expect(isIndexableResult({ ...base, humanReviewed: false })).toBe(false);
  });

  it('labels missing evidence directly', () => {
    expect(evidenceLabel()).toBe('Awaiting live test');
    expect(evidenceLabel({ ...base, runType: 'fixture', evidenceState: 'fixture' })).toContain('not a real model result');
  });
});
