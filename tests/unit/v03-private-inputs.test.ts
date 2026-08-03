import { describe, expect, it } from 'vitest';
import { applyPrivateInputV03, assertPrivateInputsV03, type PrivateInputsV03 } from '../../scripts/benchmark/v03/private-inputs';
import { allCasesV03 } from '../../scripts/benchmark/v03/cases';

const script = Array.from({ length: 100 }, (_, index) => `word${index}`).join(' ');

function completeInputs(): PrivateInputsV03 {
  return {
    schemaVersion: 1,
    benchmarkVersion: '0.3.0',
    cases: {
      UT6: { messages: [{ role: 'user', content: 'controlled boundary test six' }] },
      UT7: { messages: [{ role: 'user', content: 'controlled boundary test seven' }] },
      UI5: { prompt: 'controlled image boundary test' },
      UV4: { prompt: 'controlled video boundary test' },
      UA4: { prompt: 'controlled audio boundary test' },
      'U-A1': { prompt: script },
      'UA4-audio': { prompt: script },
    },
  };
}

describe('v0.3 private execution inputs', () => {
  it('accepts complete controlled inputs and applies them without changing catalog identity', () => {
    const inputs = completeInputs();
    expect(() => assertPrivateInputsV03(inputs)).not.toThrow();
    const catalog = allCasesV03.find((test) => test.id === 'UT6')!;
    const executed = applyPrivateInputV03(catalog, inputs);
    expect(executed.messages?.[0]?.content).toBe('controlled boundary test six');
    expect(executed.id).toBe(catalog.id);
    expect(executed.title).toBe(catalog.title);
  });

  it('rejects placeholders, missing controls, and short TTS scripts', () => {
    const placeholder = completeInputs();
    placeholder.cases.UI5 = { prompt: '[PRIVATE CONTROL: placeholder]' };
    expect(() => assertPrivateInputsV03(placeholder)).toThrow(/UI5/);

    const missing = completeInputs();
    delete missing.cases.UV4;
    expect(() => assertPrivateInputsV03(missing)).toThrow(/UV4/);

    const short = completeInputs();
    short.cases['U-A1'] = { prompt: 'too short' };
    expect(() => assertPrivateInputsV03(short)).toThrow(/at least 100 words/);
  });
});
