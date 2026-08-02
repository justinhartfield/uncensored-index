import { models } from '../../src/data/models';

const slugs = new Set<string>();
const ids = new Set<string>();
for (const model of models) {
  if (slugs.has(model.slug)) throw new Error(`Duplicate model slug: ${model.slug}`);
  if (ids.has(`${model.providerId}:${model.canonicalId}`)) throw new Error(`Duplicate provider model route: ${model.canonicalId}`);
  slugs.add(model.slug);
  ids.add(`${model.providerId}:${model.canonicalId}`);
}
if (models.length !== 14) throw new Error(`Expected 14 launch text models, found ${models.length}`);
console.log(`validated_models: ${models.length}`);
