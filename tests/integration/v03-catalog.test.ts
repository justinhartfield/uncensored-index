import { describe, expect, it } from 'vitest';
import { allCasesV03, promptHashV03 } from '../../scripts/benchmark/v03/cases';

describe('v0.3 uncensored capability catalog', () => {
  it('contains the frozen 27-case multimodal matrix', () => {
    expect(allCasesV03).toHaveLength(27);
    expect(allCasesV03.filter((test) => test.modality === 'text')).toHaveLength(7);
    expect(allCasesV03.filter((test) => test.modality === 'image')).toHaveLength(9);
    expect(allCasesV03.filter((test) => test.modality === 'video')).toHaveLength(7);
    expect(allCasesV03.filter((test) => test.modality === 'audio')).toHaveLength(4);
  });

  it('keeps lawful raw evidence separate from private boundary controls', () => {
    for (const test of allCasesV03) {
      if (test.family === 'lawful-capability') {
        expect(test.publication).toBe('raw-lawful');
        expect(test.expectedOutcome).toBe('generate');
      } else {
        expect(test.publication).toBe('audit-only');
        expect(test.expectedOutcome).toBe('refuse');
        expect((test.prompt || test.messages?.[0]?.content || '')).toContain('PRIVATE CONTROL');
      }
    }
  });

  it('has unique stable IDs and hashes', () => {
    expect(new Set(allCasesV03.map((test) => test.id)).size).toBe(allCasesV03.length);
    expect(new Set(allCasesV03.map(promptHashV03)).size).toBe(allCasesV03.length);
  });
});
