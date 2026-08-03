import { describe, expect, it } from 'vitest';
import { allCasesV03, executedPayloadHashV03 } from '../../scripts/benchmark/v03/cases';

describe('v0.3 canonical uncensored catalog', () => {
  it('contains the frozen 33-case multimodal matrix (22 lawful + 5 boundary + 6 contrast)', () => {
    expect(allCasesV03).toHaveLength(33);
    expect(allCasesV03.filter((test) => test.modality === 'text')).toHaveLength(9);
    expect(allCasesV03.filter((test) => test.modality === 'image')).toHaveLength(11);
    expect(allCasesV03.filter((test) => test.modality === 'video')).toHaveLength(8);
    expect(allCasesV03.filter((test) => test.modality === 'audio')).toHaveLength(5);
  });

  it('keeps lawful raw evidence separate from private boundary controls', () => {
    for (const test of allCasesV03) {
      if (test.family === 'lawful-capability') {
        expect(test.reviewPolicy).toBe('eligible-after-artifact-review');
        expect(test.expectedOutcome).toBe('generate');
      } else {
        expect(test.reviewPolicy).toBe('audit-only');
        expect(test.expectedOutcome).toBe('refuse');
        expect((test.prompt || test.messages?.[0]?.content || '')).toContain('PRIVATE CONTROL');
      }
    }
  });

  it('has unique stable IDs', () => {
    expect(new Set(allCasesV03.map((test) => test.id)).size).toBe(allCasesV03.length);
  });

  it('hashes exact executed inputs separately from catalog definitions', () => {
    const base = { testId: 'UA3', requestedModelId: 'venice-audio-suite', referencedInputSha256: ['a'.repeat(64)] };
    expect(executedPayloadHashV03(base)).not.toBe(executedPayloadHashV03({ ...base, referencedInputSha256: ['b'.repeat(64)] }));
  });

  it('models warnings, applicability, and boundary coverage explicitly', () => {
    expect(allCasesV03.find((test) => test.id === 'U2')?.warningTags).toContain('graphic-violence');
    expect(allCasesV03.find((test) => test.id === 'U-I6')?.warningTags).toContain('sexual-explicit');
    expect(allCasesV03.find((test) => test.id === 'UA4')?.applicability).toBe('voice-cloning-only');
    expect(allCasesV03.filter((test) => test.family === 'boundary-control').map((test) => test.id)).toEqual(['UT6', 'UT7', 'UI5', 'UV4', 'UA4']);
  });

  it('identifies all adult-flagged cases correctly', () => {
    const adultIds = allCasesV03.filter((test) => test.adultFlagged).map((test) => test.id).sort();
    expect(adultIds).toEqual([
      'U-A1', 'U-I1', 'U-I2', 'U-I3', 'U-I6', 'U-V1', 'U-V2', 'U-V3',
      'U1', 'U6',
      'UA3', 'UA4', 'UA4-audio',
      'UI5', 'UI6', 'UI7', 'UI8', 'UI9',
      'UT6', 'UT7',
      'UV4', 'UV5', 'UV6', 'UV7', 'UV8',
    ]);
  });
});