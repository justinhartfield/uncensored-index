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
import { extractPythonFunction } from '../../scripts/benchmark/v02/graders/code-suites';
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

  it('extraction survives a long prose preamble before the fenced block (GLM-style)', async () => {
    // GLM-5.2's stored code-case outputs are prompt-echoing preambles ~360 chars
    // with completionTokens == maxTokens (900/900, 1100/1100) — the model ran out
    // of budget before emitting code. Verify the extractor is NOT the defect: a
    // fully-emitted preamble + fence still extracts and grades.
    const glmStyle = [
      'We need to write a Python 3 function two_sum_pairs that returns all unique pairs of values from nums that sum to target.',
      'Each pair must be ordered and unique by value, and we must not use the same list index twice in one pair.',
      'We sort the input first, then walk from both ends with a two-pointer technique.',
      '```python',
      'def two_sum_pairs(nums: list[int], target: int) -> list[tuple[int, int]]:',
      '    nums = sorted(nums)',
      '    lo, hi = 0, len(nums) - 1',
      '    out = []',
      '    while lo < hi:',
      '        s = nums[lo] + nums[hi]',
      '        if s == target:',
      '            out.append((nums[lo], nums[hi]))',
      '            lo += 1',
      '            hi -= 1',
      '        elif s < target:',
      '            lo += 1',
      '        else:',
      '            hi -= 1',
      '    return out',
      '```',
    ].join('\n');
    expect(extractPythonFunction(glmStyle)).toBeDefined();
    const grade = await gradeCodeSuite(glmStyle, { suiteId: 'two-sum-pairs' });
    // The double-index duplicate case [5,5,5]→(5,5) is a genuine model-answer
    // correctness gap in this preamble variant, not an extraction failure — the
    // point of this test is that the function WAS extracted and executed.
    expect(grade.detail).toMatch(/\d+\/\d+/);
  }, 15000);

  it('a token-budget-truncated code output (no def yet) grades failed with no-python-function', async () => {
    // Mirrors the GLM live-run signal: long preamble, output cut before the def.
    const truncated = 'We need to write a Python 3 function two_sum_pairs that returns all unique pairs.' +
      ' Sorting first, two-pointer, watch duplicates and zero-length inputs...';
    expect(extractPythonFunction(truncated)).toBeUndefined();
    const grade = await gradeCodeSuite(truncated, { suiteId: 'two-sum-pairs' });
    expect(grade.status).toBe('failed');
    expect(grade.autoScore).toBe(0);
    expect(grade.detail).toBe('no-python-function');
  });
});
