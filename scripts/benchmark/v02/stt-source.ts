import path from 'node:path';
import { readFile } from 'node:fs/promises';

export type RunMode = 'fixture' | 'smoke' | 'live';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * Resolve the source audio for the A2 STT case.
 *
 * Fixture mode returns a synthetic payload so the gate and tests never need real
 * audio. Live mode accepts, in priority order:
 *   - BENCHMARK_STT_AUDIO_B64       (raw base64 content string)
 *   - BENCHMARK_STT_AUDIO_FILE or --stt-audio <path>  (local audio file, base64-read)
 *
 * Throws (unreachable / empty / unset) — runAudioCase converts that into an
 * errored A2 case, so a missing STT input can never abort a paid batch after
 * image/video spend.
 */
export async function resolveSttSource(mode: RunMode): Promise<{ audioB64: string; filename?: string }> {
  if (mode === 'fixture') return { audioB64: 'AAAA' };
  const fromB64 = process.env.BENCHMARK_STT_AUDIO_B64;
  if (fromB64) return { audioB64: fromB64 };
  const filePath = process.env.BENCHMARK_STT_AUDIO_FILE || arg('--stt-audio');
  if (filePath) {
    const bytes = await readFile(filePath);
    if (!bytes.length) throw new Error(`STT source audio file is empty: ${filePath}`);
    return { audioB64: bytes.toString('base64'), filename: path.basename(filePath) };
  }
  throw new Error(
    'No STT source audio for A2: set BENCHMARK_STT_AUDIO_B64 (base64) or BENCHMARK_STT_AUDIO_FILE / --stt-audio <file>',
  );
}
