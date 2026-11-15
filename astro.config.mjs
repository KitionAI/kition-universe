// @ts-check
import { defineConfig } from 'astro/config';

// Production: https://universe.kition.ai, its own site (官网与产品矩阵, D16 as revised 2026-11-03).
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
  vite: {
    ssr: { external: ['@resvg/resvg-js'] },
  },
});
