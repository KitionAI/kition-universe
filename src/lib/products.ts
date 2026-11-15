// Loads data/products.yaml — "Built with Kition": products made on top of the
// kits. Drives the Product Galaxy on the star map, /built-with/ and the
// "Settlements on this planet" lists.
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import { type Lang, href, universe } from './universe';

export type Delivery = 'embed' | 'script' | 'headless' | 'mcp';
export const DELIVERIES: Delivery[] = ['embed', 'script', 'headless', 'mcp'];
export type Category = 'office' | 'design' | 'video' | 'engineering' | 'education' | 'developer-tools' | 'ai-agent' | 'other';
export const CATEGORIES: Category[] = ['office', 'design', 'video', 'engineering', 'education', 'developer-tools', 'ai-agent', 'other'];

export interface Product {
  id: string;
  name: string;
  url?: string;
  by_kition?: boolean;
  tagline: string;
  tagline_zh?: string;
  description: string;
  description_zh?: string;
  kits: string[];
  delivery: Delivery[];
  collab?: 'none' | 'cloud' | 'server';
  category: Category;
  author: { name: string; url?: string; github?: string };
  open_source?: string;
  screenshot?: string;
  badge_verified: boolean;
  editors_pick: boolean;
  status: 'live' | 'preview' | 'paused';
  added: string;
  last_checked?: string;
  sources?: string[];
  /** how the product's planet looks in the Product Galaxy; all product planets are the same size */
  planet?: ProductPlanet;
}

export const PLANET_LOOKS = ['terra', 'gas', 'rock', 'storm', 'city', 'lava', 'ice', 'dunes'] as const;
export interface ProductPlanet {
  look?: (typeof PLANET_LOOKS)[number];
  /** main colour, #rrggbb */
  color?: string;
  ring?: boolean;
  /** 0, 1 or 2 */
  moons?: number;
}

/** The planet a product gets: what it chose, or a look picked from its id and the colour of its first kit. */
export function productPlanet(p: Product, kitColor: (kit: string) => string): Required<ProductPlanet> {
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    look: p.planet?.look ?? PLANET_LOOKS[h % PLANET_LOOKS.length],
    color: p.planet?.color ?? kitColor(p.kits[0]),
    ring: p.planet?.ring ?? false,
    moons: p.planet?.moons ?? 0,
  };
}

let cache: Product[] | undefined;

// js-yaml turns bare dates into Date objects
const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

/** Every listed product, in display order: editor's picks first, then newest first. */
export function products(): Product[] {
  if (cache) return cache;
  const file = path.resolve(process.cwd(), 'data/products.yaml');
  const data = load(fs.readFileSync(file, 'utf8')) as { products: Product[] | null };
  const order = universe().planets.map((p) => p.id);
  const list = (data.products ?? []).map((p) => ({
    ...p,
    added: day(p.added),
    last_checked: p.last_checked ? day(p.last_checked) : undefined,
    kits: [...p.kits].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
  }));
  list.sort((a, b) => Number(b.editors_pick) - Number(a.editors_pick) || b.added.localeCompare(a.added));
  cache = list;
  return list;
}

/** Live products and labeled previews; paused products keep their page only. */
export const listedProducts = () => products().filter((p) => p.status !== 'paused');

/** Listed products that use a given kit. */
export const productsOnPlanet = (kit: string) => listedProducts().filter((p) => p.kits.includes(kit));

export const productHref = (lang: Lang, id: string) => href(lang, `/built-with/${id}/`);

export const tagline = (p: Product, lang: Lang) => (lang === 'zh' && p.tagline_zh) || p.tagline;
export const description = (p: Product, lang: Lang) => (lang === 'zh' && p.description_zh) || p.description;

/** rel for links to the product's own site: nofollow until the badge is checked (Kition's own products excepted). */
export const outboundRel = (p: Product) => (p.badge_verified || p.by_kition ? 'noopener' : 'nofollow ugc noopener');

/** Up to `n` other listed products that share at least one kit with `p`, in display order. */
export const neighbourProducts = (p: Product, n = 3) =>
  listedProducts()
    .filter((x) => x.id !== p.id && x.kits.some((k) => p.kits.includes(k)))
    .slice(0, n);
