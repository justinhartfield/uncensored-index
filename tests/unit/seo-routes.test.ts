import { describe, expect, it } from 'vitest';
import { excludedSeoRoutes, indexableSeoRoutes, sitemapPaths } from '../../src/data/seo-routes';
import { v03SuiteCases } from '../../src/data/v03-suite';
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

  it('keeps retired and utility surfaces out of discovery', () => {
    expect(excludedPaths).toEqual(expect.arrayContaining([
      '/results/', '/models/', '/review/',
      '/archive/', '/archive/v02/',
      '/showcase/', '/showcase/adult/', '/manual-review/', '/compare/',
      '/rankings/v01-legacy/', '/privacy/', '/terms/',
    ]));
    expect(indexableSeoRoutes.map(r => r.path)).toEqual(expect.arrayContaining([
      '/rankings/text/', '/rankings/image/', '/rankings/video/', '/rankings/audio/',
    ]));
    expect(indexablePaths.filter((path) => excludedPaths.includes(path as never))).toEqual([]);
  });

  it('deduplicates public case routes', () => {
    const paths = sitemapPaths(['/suite/u2/', '/suite/u2/', '/']);
    expect(paths.filter((path) => path === '/suite/u2/')).toHaveLength(1);
    expect(paths.filter((path) => path === '/')).toHaveLength(1);
  });

  it('publishes only non-adult lawful case definitions in XML', async () => {
    const response = await GET({ site: new URL('https://aiuncensoredindex.com/') } as never);
    const xml = await response.text();
    for (const path of indexablePaths) expect(xml).toContain(`<loc>https://aiuncensoredindex.com${path}</loc>`);
    for (const path of excludedPaths) expect(xml).not.toContain(`<loc>https://aiuncensoredindex.com${path}</loc>`);

    const publicCases = v03SuiteCases.filter((test) => !test.adultFlagged && test.family === 'lawful-capability');
    const privateCases = v03SuiteCases.filter((test) => test.adultFlagged || test.family === 'boundary-control');
    for (const test of publicCases) expect(xml).toContain(`<loc>https://aiuncensoredindex.com/suite/${test.slug}/</loc>`);
    for (const test of privateCases) expect(xml).not.toContain(`<loc>https://aiuncensoredindex.com/suite/${test.slug}/</loc>`);
    expect(xml).not.toContain('/models/');
  });
});
