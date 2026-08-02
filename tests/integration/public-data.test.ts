import { describe, expect, it } from 'vitest';
import { publicResults } from '../../src/lib/results';

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
});
