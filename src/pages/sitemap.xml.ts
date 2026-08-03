import type { APIRoute } from 'astro';
import { mediaModels, models } from '../data/models';
import { resultByModel, isIndexableResult } from '../lib/results';
import { isPublishedV02, publicResultsV02 } from '../lib/results-v02';
export const prerender = true;
const core = [
  '/',
  '/methodology/',
  '/about/',
  '/editorial-policy/',
  '/manual-review/',
  '/review/',
  '/affiliate-disclosure/',
  '/corrections/',
  '/rankings/text/',
  '/rankings/image/',
  '/rankings/video/',
  '/rankings/audio/',
  // adult showcase intentionally omitted (noindex, interaction-gated)
  // v01 legacy omitted from default sitemap
];
export const GET: APIRoute = ({ site }) => {
  const root = site || new URL('https://example.invalid');
  const liveProfiles = [...models, ...mediaModels]
    .filter((model) => {
      const v1 = isIndexableResult(resultByModel.get(model.slug));
      const v2 = publicResultsV02.results.find((r) => r.modelSlug === model.slug);
      return v1 || isPublishedV02(v2);
    })
    .map((model) => `/models/${model.slug}/`);
  const urls = [...core, ...liveProfiles].map((pathname) => `<url><loc>${new URL(pathname, root).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
