import type { APIRoute } from 'astro';
export const prerender = true;
export const GET: APIRoute = ({ site }) => {
  const root = site || new URL('https://aiuncensoredindex.com');
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml', root).href}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
