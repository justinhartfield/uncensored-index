import { describe, expect, it } from 'vitest';
import { models } from '../../src/data/models';
import { providers } from '../../src/data/providers';
import { ModelSchema, ProviderSchema } from '../../src/lib/schemas';

describe('launch model roster', () => {
  it('contains exactly 14 validated text records', () => {
    expect(models).toHaveLength(14);
    for (const model of models) expect(ModelSchema.parse(model)).toEqual(model);
  });

  it('uses unique slugs and provider routes', () => {
    expect(new Set(models.map((model) => model.slug)).size).toBe(models.length);
    expect(new Set(models.map((model) => `${model.providerId}:${model.canonicalId}`)).size).toBe(models.length);
  });

  it('requires only OpenRouter and Venice credentials', () => {
    expect(new Set(models.map((model) => model.routeType))).toEqual(new Set(['openrouter', 'venice']));
    expect(providers).toHaveLength(2);
    for (const provider of providers) expect(ProviderSchema.parse(provider)).toEqual(provider);
    expect(providers.map((provider) => provider.credentialEnv).sort()).toEqual(['OPENROUTER_API_KEY', 'VENICE_API_KEY']);
  });
});
