import { describe, expect, it } from 'vitest';
import { promptHash, publicCases } from '../../scripts/benchmark/prompts/index';

describe('prompt versioning', () => {
  it('creates stable unique SHA-256 hashes for every public prompt', () => {
    const first = publicCases.map(promptHash);
    const second = publicCases.map(promptHash);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(publicCases.length);
    for (const hash of first) expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
