import { describe, expect, it } from 'vitest';
import { catalogFreezeExample, pickModelId, unitPrice } from '../../scripts/benchmark/v02/catalog';

describe('v0.2 frozen media catalog', () => {
  it('routes each approved image model by exact ID and frozen price', () => {
    expect(pickModelId(catalogFreezeExample, 'image', 'venice-sd35')).toBe('venice-sd35');
    expect(pickModelId(catalogFreezeExample, 'image', 'flux-2-pro')).toBe('flux-2-pro');
    expect(pickModelId(catalogFreezeExample, 'image', 'qwen-image-2')).toBe('qwen-image-2');
    expect(unitPrice(catalogFreezeExample, 'image', 'venice-sd35')).toBe(0.01);
    expect(unitPrice(catalogFreezeExample, 'image', 'flux-2-pro')).toBe(0.03);
    expect(unitPrice(catalogFreezeExample, 'image', 'qwen-image-2')).toBe(0.05);
  });

  it('fails closed instead of substituting another image model', () => {
    expect(() => pickModelId(catalogFreezeExample, 'image', 'unknown-image-model')).toThrow(
      'Frozen catalog has no image entry for requested model unknown-image-model',
    );
  });
});
