import { describe, expect, it } from 'vitest';
import { excludedSeoRoutes, indexableSeoRoutes, sitemapPaths } from '../../src/data/seo-routes';
import { GET } from '../../src/pages/sitemap.xml';

const excludedPaths = excludedSeoRoutes.map((route) => route.path);
const indexablePaths = indexableSeoRoutes.map((route) => route.path);

describe('SEO route publication boundary', () => {
  it('keeps the indexable manifest unique, canonical, and evidence-documented', () => {
    expect(new Set(indexablePaths).size).toBe(indexablePaths.length);
    for (const route of indexableSeoRoutes) {
      expect(route.path === '/' || route.path.endsWith('/')).toBe(true);
      expect(route.evidence.length).toBeGreaterThan(20);
    }
  });

  it('does not leak adult, review, legacy, legal-draft, or thin utility routes', () => {
    expect(excludedPaths).toEqual(expect.arrayContaining([
      '/showcase/adult/',
      '/manual-review/',
      '/review/',
      '/compare/',
      '/rankings/v01-legacy/',
      '/research/censorship-index/',
      '/research/model-change-log/',
      '/rankings/uncensored-ai-models/',
      '/rankings/uncensored-roleplay-models/',
      '/privacy/',
      '/terms/',
    ]));
    expect(indexablePaths.filter((path) => excludedPaths.includes(path as never))).toEqual([]);
  });

  it('adds eligible profiles without duplicating static routes', () => {
    const paths = sitemapPaths(['/models/aion-3-0/', '/models/aion-3-0/', '/']);
    expect(paths.filter((path) => path === '/models/aion-3-0/')).toHaveLength(1);
    expect(paths.filter((path) => path === '/')).toHaveLength(1);
  });

  it('renders only indexable static routes and live-reviewed profiles in XML', async () => {
    const response = await GET({ site: new URL('https://aiuncensoredindex.com/') } as never);
    const xml = await response.text();

    for (const path of indexablePaths) {
      expect(xml).toContain(`<loc>https://aiuncensoredindex.com${path}</loc>`);
    }
    for (const path of excludedPaths) {
      expect(xml).not.toContain(`<loc>https://aiuncensoredindex.com${path}</loc>`);
    }

    expect(xml).toContain('<loc>https://aiuncensoredindex.com/models/aion-3-0/</loc>');
    expect(xml).not.toContain('<loc>https://aiuncensoredindex.com/models/qwen3-6-35b-uncensored-e2ee/</loc>');
  });
});
