/**
 * The site's base path: '' at the domain root, '/universe' when served at
 * kition.ai/universe (astro.config base). `import.meta.env` only exists under
 * Vite/Astro; scripts/check-data.mjs loads this module (transitively) with
 * plain Node, so fall back to '' there.
 */
export const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL?.replace(/\/$/, '') ?? '';

/** Prefix a root-absolute path ("/favicon.svg") with the base. Leaves absolute URLs and anchors alone. */
export function withBase(p: string): string {
  if (!p.startsWith('/') || p.startsWith('//')) return p;
  return BASE + p;
}
