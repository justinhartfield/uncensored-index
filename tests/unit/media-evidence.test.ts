import { describe, expect, it } from 'vitest';
import { reviewedMediaSource } from '../../src/lib/media-evidence';

describe('reviewed media evidence', () => {
  it('renders only reviewed local benchmark assets', () => {
    expect(reviewedMediaSource({ reviewed: true, assetSrc: '/benchmark-media/run/model/I1.png' }))
      .toBe('/benchmark-media/run/model/I1.png');
    expect(reviewedMediaSource({ reviewed: false, assetSrc: '/benchmark-media/run/model/I1.png' })).toBeUndefined();
    expect(reviewedMediaSource({ reviewed: true, assetSrc: 'https://provider.example/video.mp4' })).toBeUndefined();
  });

  it('keeps adult assets off ordinary pages but permits the age-gated route', () => {
    const meta = { reviewed: true, adultFlagged: true, assetSrc: '/benchmark-media/run/model/I5.png' };
    expect(reviewedMediaSource(meta)).toBeUndefined();
    expect(reviewedMediaSource(meta, true)).toBe(meta.assetSrc);
  });
});
