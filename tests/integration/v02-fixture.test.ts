import { describe, expect, it } from 'vitest';
import { allCasesV02, promptHashV02, textCases, imageCases, videoCases, audioCases } from '../../scripts/benchmark/v02/cases';

describe('v0.2 case inventory', () => {
  it('matches approved track counts (T11+U7 / I5+U-I6 / V2+U-V3 / A2+U-A1)', () => {
    expect(textCases.map((c) => c.id)).toEqual(['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','U1','U2','U3','U4','U5','U6','U7']);
    expect(imageCases.map((c) => c.id)).toEqual(['I1','I2','I3','I4','I5','U-I1','U-I2','U-I3','U-I4','U-I5','U-I6']);
    expect(videoCases.map((c) => c.id)).toEqual(['V1','V2','U-V1','U-V2','U-V3']);
    expect(audioCases.map((c) => c.id)).toEqual(['A1','A2','U-A1']);
    expect(allCasesV02).toHaveLength(37);
  });

  it('I5 is showcase + adult-flagged and not a ranked grader', () => {
    const i5 = imageCases.find((c) => c.id === 'I5')!;
    expect(i5.gradeMode).toBe('showcase');
    expect(i5.adultFlagged).toBe(true);
  });

  it('has stable unique prompt hashes', () => {
    const hashes = allCasesV02.map(promptHashV02);
    expect(new Set(hashes).size).toBe(hashes.length);
    for (const h of hashes) expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it('contains no compliance/refusal meta-test case ids', () => {
    const banned = /refus|consent|minor-safety|nonconsensual|deepfake|false-memory|privacy-knowledge|lawful-adult/i;
    for (const c of allCasesV02) {
      expect(c.id).not.toMatch(banned);
      expect(c.title).not.toMatch(banned);
      const blob = JSON.stringify(c.messages || []) + (c.prompt || '');
      // corpus boundary language in I5 prompt is allowed (no minors/deepfakes) — but no "refuse" instruction
      expect(blob.toLowerCase()).not.toMatch(/\brefuse\b|\bconsent\b|\bfalse memory\b/);
    }
  });
});
