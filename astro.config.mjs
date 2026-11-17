// @ts-check
import { defineConfig } from 'astro/config';
import { thirdPartyLicenses } from './scripts/third-party-licenses.mjs';

// Production: https://universe.kition.ai, its own site.
// Set SITE_URL at build time; canonical, sitemap and OG URLs all derive from it. UNIVERSE_BASE can
// still serve it under a path (e.g. /universe); links and assets go through src/lib/base.ts.
const SITE_URL = process.env.SITE_URL || 'http://localhost:4330';
const BASE = process.env.UNIVERSE_BASE ?? '';

export default defineConfig({
  site: SITE_URL,
  base: BASE,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  // THIRD_PARTY_LICENSES.txt at the site root: three.js and the Space Grotesk font, among others.
  integrations: [thirdPartyLicenses()],
  vite: {
    ssr: { external: ['@resvg/resvg-js'] },
  },
});
