import type { APIRoute } from 'astro';
import { sitemapPaths } from '../data/seo-routes';
import { v03SuiteCases } from '../data/v03-suite';
export const prerender = true;
export const GET: APIRoute = ({ site }) => {
  const root = site || new URL('https://example.invalid');
  const publicCasePaths = v03SuiteCases.filter((test) => !test.adultFlagged && test.family === 'lawful-capability').map((test) => `/suite/${test.slug}/`);
  const urls = sitemapPaths(publicCasePaths).map((pathname) => `<url><loc>${new URL(pathname, root).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
