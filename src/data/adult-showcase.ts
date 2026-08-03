export interface AdultShowcaseSample {
  id: string;
  modelSlug: string;
  modelName: string;
  caption: string;
  assetSrc?: string;
  alt?: string;
  reviewed: boolean;
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
    internalBlur: true, // Provider-generated internal blur — not a site filter
  },
];
