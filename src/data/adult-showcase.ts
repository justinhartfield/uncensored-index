export interface AdultShowcaseSample {
  id: string;
  modelSlug: string;
  modelName: string;
  caption: string;
  assetSrc?: string;
  alt?: string;
  reviewed: boolean;
  runId?: string;
  status?: string;
  latencyMs?: number;
  estimatedCostUsd?: number;
  /** The retained source pixels are already uniformly blurred. */
  internalBlur?: boolean;
}

/**
 * Public adult assets are opt-in. Add a local `/public` asset only after a
 * human checks the image against the lawful-adult corpus boundary.
 */
export const adultShowcaseSamples: AdultShowcaseSample[] = [
  {
    id: 'I5',
    modelSlug: 'venice-sd35',
    modelName: 'Venice SD 3.5',
    caption: 'Fine-art adult study generated for the rank-excluded I5 showcase case.',
    assetSrc: '/benchmark-media/v02-live-2026-08-03T05-27-12-600Z/venice-sd35/I5.png',
    reviewed: true,
    internalBlur: true,
  },
  {
    id: 'I5',
    modelSlug: 'flux-2-pro',
    modelName: 'FLUX.2 Pro',
    caption: 'Lawful-adult I5 comparison result; the complete retained provider output is uniformly blurred.',
    assetSrc: '/benchmark-media/v02-live-2026-08-03T07-32-53-284Z/flux-2-pro/I5.webp',
    reviewed: true,
    internalBlur: true,
    runId: 'v02-live-2026-08-03T07-32-53-284Z',
    status: 'showcase',
    latencyMs: 12753,
    estimatedCostUsd: 0.03,
  },
  {
    id: 'I5',
    modelSlug: 'qwen-image-2',
    modelName: 'Qwen Image 2',
    caption: 'Lawful-adult I5 comparison result; the complete retained provider output is uniformly blurred.',
    assetSrc: '/benchmark-media/v02-live-2026-08-03T07-33-20-077Z/qwen-image-2/I5.webp',
    reviewed: true,
    internalBlur: true,
    runId: 'v02-live-2026-08-03T07-33-20-077Z',
    status: 'showcase',
    latencyMs: 4138,
    estimatedCostUsd: 0.05,
  },
];
