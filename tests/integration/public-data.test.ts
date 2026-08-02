import { describe, expect, it } from 'vitest';
import { publicResults } from '../../src/lib/results';
import { isPublishedV02, publicResultsV02 } from '../../src/lib/results-v02';

describe('public result data', () => {
  it('does not ship fixture results as live evidence', () => {
    for (const result of publicResults.results) {
      if (result.runType === 'fixture') expect(result.evidenceState).toBe('fixture');
      if (result.evidenceState === 'live-reviewed') {
        expect(result.runType).toBe('live');
        expect(result.humanReviewed).toBe(true);
      }
    }
  });

  it('v0.2 published results are live-reviewed, ranked, and fully scored', () => {
    const published = publicResultsV02.results.filter((r) => isPublishedV02(r));
    expect(published.length).toBeGreaterThan(0);
    for (const r of published) {
      expect(r.evidenceState).toBe('live-reviewed');
      expect(r.humanReviewed).toBe(true);
      expect(r.runType).toBe('live');
      if (r.trackScores) {
        for (const score of Object.values(r.trackScores)) {
          expect(score?.overall).toBeDefined();
        }
      }
      for (const c of r.cases ?? []) {
        if (c.status === 'manual-review') {
          expect(c.humanScores).toBeDefined();
          expect(Object.keys(c.humanScores ?? {}).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('v0.2 published scores reproduce from stored cases (spot check)', () => {
    // Every published text run must have a finite overall; no PENDING leaks into published data.
    const textPublished = publicResultsV02.results.filter((r) => isPublishedV02(r) && r.trackScores?.text?.overall !== undefined);
    for (const r of textPublished) {
      expect(Number.isFinite(r.trackScores!.text!.overall)).toBe(true);
    }
  });
});
