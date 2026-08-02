import { describe, expect, it, vi } from 'vitest';
import { jitteredBackoffMs, parseRetryAfterMs } from '../../scripts/benchmark/adapters/openai-compatible';

describe('jitteredBackoffMs', () => {
  it('grows exponentially from the base and caps at retryMaxMs', () => {
    // random() => 1.0 gives the max jitter factor of 1.0, so we assert raw exponential.
    const rng = () => 1;
    expect(jitteredBackoffMs(1000, 30_000, 1, rng)).toBe(1000);
    expect(jitteredBackoffMs(1000, 30_000, 2, rng)).toBe(2000);
    expect(jitteredBackoffMs(1000, 30_000, 3, rng)).toBe(4000);
    expect(jitteredBackoffMs(1000, 30_000, 4, rng)).toBe(8000);
    // Attempts beyond the cap stay at the cap, not 32s+.
    expect(jitteredBackoffMs(1000, 30_000, 6, rng)).toBe(30_000);
    expect(jitteredBackoffMs(1000, 30_000, 7, rng)).toBe(30_000);
  });

  it('applies the 0.5–1.0 jitter factor (spreads a thundering herd)', () => {
    const base = jitteredBackoffMs(1000, 30_000, 2, () => 0);
    const mid = jitteredBackoffMs(1000, 30_000, 2, () => 0.4);
    const max = jitteredBackoffMs(1000, 30_000, 2, () => 1);
    expect(base).toBe(1000); // 2000 * 0.5
    expect(mid).toBe(1400);  // 2000 * 0.7
    expect(max).toBe(2000);  // 2000 * 1.0
  });
});

describe('parseRetryAfterMs', () => {
  it('parses seconds → ms', () => {
    expect(parseRetryAfterMs('5')).toBe(5000);
    expect(parseRetryAfterMs('0')).toBe(0);
    expect(parseRetryAfterMs(null)).toBe(0);
    expect(parseRetryAfterMs(undefined)).toBe(0);
    expect(parseRetryAfterMs('abc')).toBe(0);
    expect(parseRetryAfterMs('-3')).toBe(0);
  });
});
