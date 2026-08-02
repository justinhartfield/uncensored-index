import { describe, expect, it } from 'vitest';
import {
  countSyllables,
  gradeExactAnswer,
  gradeFactSet,
  gradeJsonSchema,
  gradeSyllableConstraint,
  gradeWer,
  wordErrorRate,
} from '../../scripts/benchmark/v02/graders/index';
import { gradeCodeSuite } from '../../scripts/benchmark/v02/graders/index';
import { textFixtures } from '../../scripts/benchmark/v02/adapters/fixture';
import { textCases } from '../../scripts/benchmark/v02/cases';

describe('v0.2 auto-graders', () => {
  it('counts syllables with a stable heuristic', () => {
    expect(countSyllables('ocean')).toBeGreaterThanOrEqual(2);
    expect(countSyllables('cat')).toBe(1);
  });

  it('grades haiku constraints on the fixture output', () => {
    const cfg = textCases.find((c) => c.id === 'T4')!.graderConfig!;
    const result = gradeSyllableConstraint(textFixtures.T4!, cfg as any);
    expect(result.status).toBe('passed');
    expect(result.autoScore).toBe(100);
  });

  it('exact-answer matcher is strict (no suffix/substring traps)', () => {
    expect(gradeExactAnswer('The answer is 7.', { answers: ['7'], extractMode: 'last-integer' }).status).toBe('passed');
    expect(gradeExactAnswer('The answer is 17.', { answers: ['7'], extractMode: 'last-integer' }).status).toBe('failed');
    expect(gradeExactAnswer('Oli', { answers: ['oli'], extractMode: 'normalized-line' }).status).toBe('passed');
    expect(gradeExactAnswer('music', { answers: ['oli'], extractMode: 'normalized-line' }).status).toBe('failed');
    // single-letter keys rejected; single-digit integer keys allowed
    expect(gradeExactAnswer('c', { answers: ['c'], extractMode: 'normalized-line' }).status).toBe('failed');
    expect(gradeExactAnswer('7', { answers: ['7'], extractMode: 'last-integer' }).status).toBe('passed');
    expect(gradeExactAnswer('nope', { answers: ['7'], extractMode: 'last-integer' }).status).toBe('failed');
  });

  it('fact-set scores partial credit', () => {
    const cfg = textCases.find((c) => c.id === 'T10')!.graderConfig!;
    const full = gradeFactSet(textFixtures.T10!, cfg as any);
    expect(full.autoScore).toBe(100);
    const partial = gradeFactSet('1. Au\n2. 1969\n3. wrong\n4. 8\n5. Orwell', cfg as any);
    expect(partial.autoScore).toBe(80);
  });

  it('json-schema rejects extra keys and accepts fixture', () => {
    const cfg = textCases.find((c) => c.id === 'T11')!.graderConfig!;
    expect(gradeJsonSchema(textFixtures.T11!, cfg as any).status).toBe('passed');
    expect(gradeJsonSchema('{"id":"x","displayName":"y","age":20,"tags":["a"],"active":true,"createdAt":"2026-01-01","nope":1}', cfg as any).status).toBe('failed');
  });

  it('WER is zero on identical transcript and scores fixture STT', () => {
    const ref = 'the quick copper fox vaulted past the dozen quiet hens before dawn';
    expect(wordErrorRate(ref, ref)).toBe(0);
    expect(gradeWer(ref, { referenceText: ref }).autoScore).toBe(100);
    expect(gradeWer('totally different words here', { referenceText: ref }).autoScore!).toBeLessThan(50);
  });

  it('code suites execute hidden tests (not compile-only)', async () => {
    const t5 = await gradeCodeSuite(textFixtures.T5!, { suiteId: 'two-sum-pairs' });
    const t6 = await gradeCodeSuite(textFixtures.T6!, { suiteId: 'csv-validate' });
    const t7 = await gradeCodeSuite(textFixtures.T7!, { suiteId: 'fix-bug' });
    expect(t5.status).toBe('passed');
    expect(t6.status).toBe('passed');
    expect(t7.status).toBe('passed');
    const bad = await gradeCodeSuite('```python\ndef two_sum_pairs(nums, target):\n  return []\n```', { suiteId: 'two-sum-pairs' });
    expect(bad.status).toBe('failed');
  }, 15000);
});
