/**
 * Frozen live catalog — required for live media runs.
 *
 * Source of truth: `benchmark-private/catalog-freeze.json` (gitignored)
 * or path in BENCHMARK_CATALOG_FREEZE_PATH.
 *
 * Shape is recorded in PLANS/ALLHANDS_BUILD_TRACKER.md Live Catalog Freeze template.
 * Live mode refuses to start media tracks without a freeze file that includes
 * model IDs + unit prices + maxSpendUsd.
 */
import { readFile } from 'node:fs/promises';

export interface CatalogModelPrice {
  modelId: string;
  /** USD per image / per video / per 1k chars TTS / per audio minute STT, depending on modality */
  unitPriceUsd: number;
  notes?: string;
  tier?: string;
}

export interface CatalogFreeze {
  schemaVersion: 1;
  frozenAt: string;
  frozenBy: string;
  maxSpendUsd: number;
  veniceClientNote?: string;
  text?: CatalogModelPrice[];
  image: CatalogModelPrice[];
  video: CatalogModelPrice[];
  audioTts: CatalogModelPrice[];
  audioStt: CatalogModelPrice[];
}

export type MediaKind = 'image' | 'video' | 'audioTts' | 'audioStt';

let cached: CatalogFreeze | undefined;

export function catalogPath(): string {
  return process.env.BENCHMARK_CATALOG_FREEZE_PATH || 'benchmark-private/catalog-freeze.json';
}

export async function loadCatalogFreeze(required = false): Promise<CatalogFreeze | undefined> {
  if (cached) return cached;
  const path = catalogPath();
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as CatalogFreeze;
    if (raw.schemaVersion !== 1) throw new Error(`unsupported catalog schemaVersion ${raw.schemaVersion}`);
    if (!(raw.maxSpendUsd > 0)) throw new Error('catalog maxSpendUsd must be > 0');
    for (const key of ['image', 'video', 'audioTts', 'audioStt'] as const) {
      if (!Array.isArray(raw[key]) || raw[key]!.length === 0) {
        throw new Error(`catalog missing ${key} model list`);
      }
      for (const row of raw[key]!) {
        if (!row.modelId?.trim()) throw new Error(`catalog ${key} entry missing modelId`);
        if (!(row.unitPriceUsd >= 0)) throw new Error(`catalog ${key} ${row.modelId} missing unitPriceUsd`);
      }
    }
    cached = raw;
    return raw;
  } catch (error) {
    if (!required) return undefined;
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Live catalog freeze required at ${path} (or BENCHMARK_CATALOG_FREEZE_PATH). ${msg}. ` +
        'Fill PLANS/ALLHANDS_BUILD_TRACKER.md freeze template before paid runs.',
    );
  }
}

export function pickModelId(catalog: CatalogFreeze, kind: MediaKind, preferred?: string): string {
  const list = catalog[kind];
  if (preferred) {
    const hit = list.find((m) => m.modelId === preferred);
    if (hit) return hit.modelId;
    throw new Error(`Frozen catalog has no ${kind} entry for requested model ${preferred}`);
  }
  return list[0]!.modelId;
}

export function unitPrice(catalog: CatalogFreeze, kind: MediaKind, modelId: string): number | undefined {
  return catalog[kind].find((m) => m.modelId === modelId)?.unitPriceUsd;
}

/** Example freeze file shape — never used as live defaults. */
export const catalogFreezeExample: CatalogFreeze = {
  schemaVersion: 1,
  frozenAt: '2026-08-02T00:00:00.000Z',
  frozenBy: 'example-only',
  maxSpendUsd: 25,
  veniceClientNote: 'api.venice.ai/api/v1 — replace IDs after /models/list freeze',
  image: [
    { modelId: 'venice-sd35', unitPriceUsd: 0.01, tier: 'default' },
    { modelId: 'flux-2-pro', unitPriceUsd: 0.03, tier: 'default' },
    { modelId: 'qwen-image-2', unitPriceUsd: 0.05, tier: 'default' },
  ],
  video: [{ modelId: 'REPLACE_VIDEO_MODEL', unitPriceUsd: 0.4, notes: '5s/720p quote' }],
  audioTts: [{ modelId: 'REPLACE_TTS_MODEL', unitPriceUsd: 0.002, notes: 'per 1k chars' }],
  audioStt: [{ modelId: 'REPLACE_STT_MODEL', unitPriceUsd: 0.006, notes: 'per audio minute' }],
};
