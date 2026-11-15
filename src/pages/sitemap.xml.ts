// Generated from data/universe.yaml and data/products.yaml, with hreflang alternates for en and zh.
import type { APIRoute } from 'astro';
import { universe, LANGS, prefix } from '../lib/universe';
import { scenarioGalaxies } from '../lib/scenarioGalaxies';
import { products } from '../lib/products';

export const GET: APIRoute = ({ site }) => {
  const paths = [
    '/',
    '/catalog/',
    '/protocol/',
    '/scenarios/',
    ...scenarioGalaxies.map(g=>`/scenarios/${g.id}/`),
    ...universe().planets.map((p) => `/planet/${p.id}/`),
    '/built-with/',
    '/built-with/badge/',
    '/built-with/submit/',
    ...products().map((p) => `/built-with/${p.id}/`),
  ];
  const loc = (lang: (typeof LANGS)[number], p: string) => new URL(`${prefix(lang)}${p}`, site).href;
  const urls = paths.flatMap((p) =>
    LANGS.map(
      (lang) => `  <url>
    <loc>${loc(lang, p)}</loc>
${LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l === 'zh' ? 'zh-CN' : 'en'}" href="${loc(l, p)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc('en', p)}"/>
  </url>`,
    ),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
