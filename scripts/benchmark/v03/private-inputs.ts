import { readFile } from 'node:fs/promises';
import type { Message } from '../v02/types';
import type { TestCaseV03 } from './types';

export interface PrivateCaseInputV03 {
  messages?: Message[];
  prompt?: string;
  negativePrompt?: string;
}

export interface PrivateInputsV03 {
  schemaVersion: 1;
  benchmarkVersion: '0.3.0';
  cases: Record<string, PrivateCaseInputV03>;
}

export const requiredPrivateInputIdsV03 = [
  'UT6', 'UT7', 'UI5', 'UV4', 'UA4',
  'U-A1', 'UA4-audio',
] as const;

export function privateInputsPathV03(): string {
  return process.env.BENCHMARK_V03_PRIVATE_INPUTS_PATH || 'benchmark-private/v03-private-inputs.json';
}

function meaningful(value: string | undefined): boolean {
  const text = value?.trim() || '';
  return Boolean(text && !/PRIVATE CONTROL|REPLACE_|EXAMPLE ONLY/i.test(text));
}

export function assertPrivateInputsV03(raw: PrivateInputsV03): void {
  if (raw.schemaVersion !== 1 || raw.benchmarkVersion !== '0.3.0') {
    throw new Error('v0.3 private inputs require schemaVersion 1 and benchmarkVersion 0.3.0');
  }
  if (!raw.cases || typeof raw.cases !== 'object') throw new Error('v0.3 private inputs missing cases map');
  for (const id of requiredPrivateInputIdsV03) {
    const input = raw.cases[id];
    if (!input) throw new Error(`v0.3 private inputs missing ${id}`);
    if (id === 'UT6' || id === 'UT7') {
      if (!input.messages?.length || input.messages.some((message) => !meaningful(message.content))) {
        throw new Error(`v0.3 private input ${id} requires complete non-placeholder messages`);
      }
    } else if (!meaningful(input.prompt)) {
      throw new Error(`v0.3 private input ${id} requires a complete non-placeholder prompt/script`);
    }
  }

  for (const id of ['U-A1', 'UA4-audio'] as const) {
    const words = raw.cases[id]!.prompt!.trim().split(/\s+/).length;
    if (words < 100) throw new Error(`v0.3 private TTS script ${id} must contain at least 100 words (found ${words})`);
  }
}

export async function loadPrivateInputsV03(required = false): Promise<PrivateInputsV03 | undefined> {
  const source = privateInputsPathV03();
  try {
    const raw = JSON.parse(await readFile(source, 'utf8')) as PrivateInputsV03;
    assertPrivateInputsV03(raw);
    return raw;
  } catch (error) {
    if (!required) return undefined;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Complete v0.3 private inputs required at ${source}: ${message}`);
  }
}

export function applyPrivateInputV03(test: TestCaseV03, inputs: PrivateInputsV03): TestCaseV03 {
  const override = inputs.cases[test.id];
  if (!override) return { ...test };
  return {
    ...test,
    ...(override.messages ? { messages: override.messages.map((message) => ({ ...message })) } : {}),
    ...(override.prompt ? { prompt: override.prompt } : {}),
    ...(override.negativePrompt ? { negativePrompt: override.negativePrompt } : {}),
  };
}
