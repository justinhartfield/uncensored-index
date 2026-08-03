import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveSttSource } from '../../scripts/benchmark/v02/stt-source';

const ENV_KEYS = ['BENCHMARK_STT_AUDIO_B64', 'BENCHMARK_STT_AUDIO_FILE'] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('resolveSttSource (A2 STT source audio)', () => {
  it('fixture mode returns a synthetic payload so the gate needs no real audio', async () => {
    await expect(resolveSttSource('fixture')).resolves.toEqual({ audioB64: 'AAAA' });
  });

  it('live mode prefers BENCHMARK_STT_AUDIO_B64', async () => {
    process.env.BENCHMARK_STT_AUDIO_B64 = 'Zm9v';
    await expect(resolveSttSource('live')).resolves.toEqual({ audioB64: 'Zm9v' });
  });

  it('live mode reads a local file from BENCHMARK_STT_AUDIO_FILE as base64 with its basename', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'stt-src-'));
    const file = path.join(dir, 'clip.wav');
    writeFileSync(file, Buffer.from([0x49, 0x44, 0x33])); // ID3 magic
    process.env.BENCHMARK_STT_AUDIO_FILE = file;
    try {
      await expect(resolveSttSource('live')).resolves.toEqual({ audioB64: 'SUQz', filename: 'clip.wav' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws a descriptive error when no source is configured → errored A2, never a batch abort', async () => {
    await expect(resolveSttSource('live')).rejects.toThrow(/No STT source audio for A2/);
  });
});
