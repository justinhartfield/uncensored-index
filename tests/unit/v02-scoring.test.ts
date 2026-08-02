import { describe, expect, it } from 'vitest';
import { relativeToMin, scoreAudioTrack, scoreImageTrack, scoreTextTrack, scoreVideoTrack } from '../../scripts/benchmark/v02/score';
import type { CaseResultV02 } from '../../scripts/benchmark/v02/types';

function base(partial: Partial<CaseResultV02> & Pick<CaseResultV02, 'testId' | 'modality' | 'status'>): CaseResultV02 {
  return {
    promptHash: 'a'.repeat(64),
    latencyMs: 100,
    publicExcerpt: '',
    requestedModelId: 'm',
    ...partial,
  };
}

describe('v0.2 composites', () => {
  it('relative-to-min caps at 100', () => {
    expect(relativeToMin(200, 100)).toBe(50);
    expect(relativeToMin(50, 100)).toBe(100);
  });

  it('text weights match approved formula', () => {
    const cases: CaseResultV02[] = [
      base({ testId: 'T1', modality: 'text', status: 'manual-review', humanScores: { voice: 5, coherence: 5 }, latencyMs: 100 }),
      base({ testId: 'T2', modality: 'text', status: 'manual-review', humanScores: { voice: 5, coherence: 5 }, latencyMs: 100 }),
      base({ testId: 'T3', modality: 'text', status: 'manual-review', humanScores: { depth: 5, consistency: 5 }, latencyMs: 100 }),
      ...['T4','T5','T6','T7','T8','T9','T10','T11'].map((id) =>
        base({ testId: id, modality: 'text', status: 'passed', autoScore: 100, latencyMs: 100, estimatedCostUsd: 0.01 }),
      ),
    ];
    // mins.cost is per-case mean (aligned with trackMins / score*Track)
    const score = scoreTextTrack(cases, { p50Latency: 100, cost: 0.01 });
    // OQ=100, Cap=100, Speed=100, Cost=100, Rel=100 => overall 100
    expect(score.outputQuality).toBe(100);
    expect(score.capability).toBe(100);
    expect(score.overall).toBe(100);
    // Explicit weight check via a speed-only degradation
    const slow = cases.map((c) => ({ ...c, latencyMs: 200 }));
    const slowScore = scoreTextTrack(slow, { p50Latency: 100, cost: 0.01 });
    // speed contributes 0.15 * 50 = 7.5 drop from 100
    expect(slowScore.speed).toBe(50);
    expect(slowScore.overall).toBeCloseTo(100 - 7.5, 5);
  });

  it('image excludes I5 from rank composite', () => {
    const cases: CaseResultV02[] = [
      base({ testId: 'I1', modality: 'image', status: 'manual-review', humanScores: { adherence: 5 }, latencyMs: 50, estimatedCostUsd: 0.02 }),
      base({ testId: 'I2', modality: 'image', status: 'manual-review', humanScores: { aesthetic: 5 }, latencyMs: 50, estimatedCostUsd: 0.02 }),
      base({ testId: 'I3', modality: 'image', status: 'manual-review', humanScores: { 'text-render': 5 }, latencyMs: 50, estimatedCostUsd: 0.02 }),
      base({ testId: 'I4', modality: 'image', status: 'manual-review', humanScores: { control: 5 }, latencyMs: 50, estimatedCostUsd: 0.02 }),
      base({ testId: 'I5', modality: 'image', status: 'showcase', latencyMs: 5000, estimatedCostUsd: 9 }),
    ];
    const score = scoreImageTrack(cases, { p50Latency: 50, cost: 0.02 });
    expect(score.overall).toBe(100);
    expect(score.speed).toBe(100); // I5 latency ignored
  });

  it('video and audio formulas land at 100 on perfect inputs', () => {
    const video = scoreVideoTrack([
      base({ testId: 'V1', modality: 'video', status: 'manual-review', humanScores: { adherence: 5, motion: 5 }, latencyMs: 1000, estimatedCostUsd: 0.2 }),
      base({ testId: 'V2', modality: 'video', status: 'manual-review', humanScores: { adherence: 5, motion: 5 }, latencyMs: 1000, estimatedCostUsd: 0.2 }),
    ], { p50Latency: 1000, cost: 0.2 });
    expect(video.overall).toBe(100);

    const audio = scoreAudioTrack([
      base({ testId: 'A1', modality: 'audio', status: 'manual-review', humanScores: { naturalness: 5, intelligibility: 5 }, latencyMs: 30, estimatedCostUsd: 0.001 }),
      base({ testId: 'A2', modality: 'audio', status: 'passed', autoScore: 100, latencyMs: 30, estimatedCostUsd: 0.001 }),
    ], { p50Latency: 30, cost: 0.001 });
    expect(audio.overall).toBe(100);
  });

  it('costEfficiency discriminates on image when unit prices differ (mean-vs-mean)', () => {
    const cheap: CaseResultV02[] = [
      base({ testId: 'I1', modality: 'image', status: 'manual-review', humanScores: { adherence: 5 }, latencyMs: 50, estimatedCostUsd: 0.01 }),
      base({ testId: 'I2', modality: 'image', status: 'manual-review', humanScores: { aesthetic: 5 }, latencyMs: 50, estimatedCostUsd: 0.01 }),
      base({ testId: 'I3', modality: 'image', status: 'manual-review', humanScores: { 'text-render': 5 }, latencyMs: 50, estimatedCostUsd: 0.01 }),
      base({ testId: 'I4', modality: 'image', status: 'manual-review', humanScores: { control: 5 }, latencyMs: 50, estimatedCostUsd: 0.01 }),
    ];
    const pricey = cheap.map((c) => ({ ...c, estimatedCostUsd: 0.03 }));
    const mins = { p50Latency: 50, cost: 0.01 }; // mean of cheap
    const a = scoreImageTrack(cheap, mins);
    const b = scoreImageTrack(pricey, mins);
    expect(a.costEfficiency).toBe(100);
    // score*Track rounds to 1 decimal
    expect(b.costEfficiency).toBeCloseTo(100 * 0.01 / 0.03, 1);
    expect(a.overall).toBeGreaterThan(b.overall);
  });
});
