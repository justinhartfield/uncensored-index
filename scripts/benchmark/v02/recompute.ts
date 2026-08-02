/**
 * Recompute track scores from a stored run directory and exit non-zero on mismatch.
 * Usage: tsx scripts/benchmark/v02/recompute.ts --dir benchmark-results-fixture/<runId>
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { scoreTrack, trackMins } from './score';
import type { ModelRunV02, Modality } from './types';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('--dir required');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
  const runs: ModelRunV02[] = [];
  for (const file of files) {
    runs.push(JSON.parse(await readFile(path.join(dir, file), 'utf8')) as ModelRunV02);
  }
  let mismatches = 0;
  for (const run of runs) {
    for (const modality of Object.keys(run.trackScores || {}) as Modality[]) {
      const mins = trackMins(runs, modality);
      const cases = run.cases.filter((c) => c.modality === modality);
      const recomputed = scoreTrack(modality, cases, mins);
      const stored = run.trackScores[modality]!;
      for (const key of Object.keys(recomputed) as (keyof typeof recomputed)[]) {
        if (stored[key] !== recomputed[key]) {
          console.error(`${run.modelSlug}/${modality}.${key}: stored=${stored[key]} recomputed=${recomputed[key]}`);
          mismatches += 1;
        }
      }
    }
  }
  if (mismatches) {
    console.error(`mismatch_count: ${mismatches}`);
    process.exitCode = 1;
    return;
  }
  console.log(`recompute_ok: ${runs.length} models, 0 mismatches`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
