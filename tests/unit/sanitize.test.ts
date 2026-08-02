import { describe, expect, it } from 'vitest';
import { publicExcerpt, redactSecrets } from '../../scripts/benchmark/sanitize';

describe('public sanitization', () => {
  it('redacts token-shaped values', () => {
    const secret = `sk-${'x'.repeat(32)}`;
    expect(redactSecrets(`token=${secret}`)).not.toContain(secret);
  });

  it('never publishes private case output', () => {
    expect(publicExcerpt('private explicit output', false)).toBe('[Private benchmark output withheld]');
  });

  it('normalizes and truncates public excerpts', () => {
    expect(publicExcerpt('a\n\n b', true)).toBe('a b');
    expect(publicExcerpt('x'.repeat(500), true).length).toBeLessThanOrEqual(360);
  });
});
