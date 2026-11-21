// Loads data/universe.yaml — the single source for the star map, the catalog,
// every planet page, sitemap.xml, llms.txt and the OG images.
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import { BASE } from './base.ts';

export type Lang = 'en' | 'zh';
export const LANGS: Lang[] = ['en', 'zh'];
export type L = { en: string; zh: string };

/** Exactly three kits are Preview (html, design, scene); the others carry no maturity label. */
export type Status = 'preview';
export type BuildingShape = 'tower' | 'dome' | 'block' | 'columns' | 'crane' | 'screen' | 'stack' | 'spire';

export interface Capability {
  id: string;
  building: L; // made-up building name, e.g. "Sheet Bank"
  title: L;
  body: L;
  shape: BuildingShape;
}

/** Something you can make with a kit (data/scenarios.yaml), shown as a hologram over the city. */
export interface Scenario {
  id: string;
  art: string;
  uses: string[]; // capability ids
  template?: string; // a published Kition template
  title: L;
  body: L;
}

export interface Planet {
  id: string;
  order: number;
  name: string; // public kit name: note, table, ...
  cluster: string;
  kitId: string; // engine id in the Kition repo
  planet: L; // "Library Planet"
  ext: string; // native file extension, '' when none
  status?: Status;
  version?: string;
  color: { light: string; dark: string };
  surface: {
    style: 'bands' | 'craters' | 'grid' | 'swirl' | 'patches';
    ring?: boolean;
    scaffold?: boolean;
    /** what the globe looks like on the star map (src/scripts/scene/planetSurface.ts); default: from `style` */
    look?: 'terra' | 'gas' | 'rock' | 'storm' | 'city' | 'lava' | 'ice' | 'dunes';
    /** size against the standard planet, 0.8 to 1.35 */
    size?: number;
    moons?: number;
    clouds?: boolean;
    /** axial tilt in radians */
    tilt?: number;
  };
  /** the globe on the star map, described in words */
  world: L;
  tagline: L;
  summary: L;
  capabilities: Capability[];
  formats: { native: string[]; opens: string[] };
  commands: { name: string; what: L }[];
  ship: L; // what an agent ship does when it lands here
  repo: string;
  sources: string[];
  tools: unknown[]; // reserved for the free in-browser tools (next phase)
  scenarios: Scenario[]; // from data/scenarios.yaml
}

export interface Cluster {
  id: string;
  name: string; // "Kition Office"
  label: L; // "Office Cluster"
  blurb: L;
  angle: number; // degrees, position around the star
  distance: number;
}


export interface Station {
  id: string;
  name: L;
  kind: 'market' | 'ai' | 'ui';
  angle: number;
  distance: number;
  height: number;
  title: L;
  body: L;
  cta: L;
  href: string;
}

export interface Galaxy {
  id: string;
  name: L;
  body: L;
  href: string;
  position: [number, number, number];
}

export interface Universe {
  site: {
    name: string;
    links: Record<string, string>;
    facts: { license: string };
  };
  star: { name: string; short: string; tagline: L; body: L; lines: L[]; href: string };
  clusters: Cluster[];
  planets: Planet[];
  stations: Station[];
  galaxies: Galaxy[];
  mcp: { docs: string; intro: L; snippet: string; note: L };
  newKit: { angle: number; distance: number; height: number; name: L; title: L; body: L; cta: L; href: string };
  productGalaxy: {
    name: L;
    position: [number, number, number];
    blurb: L;
    sdk: { name: string; license: string; body: L; href: string; docs: string };
    delivery: { id: 'embed' | 'script' | 'headless' | 'mcp'; name: string; body: L; docs: string }[];
    add: { name: L; title: L; body: L; cta: L };
  };
}

let cache: Universe | undefined;

export function universe(): Universe {
  if (cache) return cache;
  const file = path.resolve(process.cwd(), 'data/universe.yaml');
  const data = load(fs.readFileSync(file, 'utf8')) as Universe;
  data.planets.sort((a, b) => a.order - b.order);
  const scenarios = load(fs.readFileSync(path.resolve(process.cwd(), 'data/scenarios.yaml'), 'utf8')) as Record<string, Scenario[]>;
  for (const p of data.planets) p.scenarios = scenarios[p.id] ?? [];
  cache = data;
  return data;
}

export const t = (l: L | undefined, lang: Lang): string => (l ? l[lang] || l.en : '');

export function planet(id: string): Planet {
  const p = universe().planets.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown planet ${id}`);
  return p;
}

export function cluster(id: string): Cluster {
  const c = universe().clusters.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown cluster ${id}`);
  return c;
}

export const planetsIn = (clusterId: string) => universe().planets.filter((p) => p.cluster === clusterId);

/** Same-cluster neighbours first, then the planets next to it in the fixed order. */
export function neighbours(id: string): { cluster: Planet[]; next?: Planet; prev?: Planet } {
  const all = universe().planets;
  const me = planet(id);
  const i = all.indexOf(me);
  return {
    cluster: all.filter((p) => p.cluster === me.cluster && p.id !== id),
    prev: all[(i - 1 + all.length) % all.length],
    next: all[(i + 1) % all.length],
  };
}

export const prefix = (lang: Lang) => BASE + (lang === 'en' ? '' : `/${lang}`);
export const href = (lang: Lang, p: string) => `${prefix(lang)}${p}`;
export const planetHref = (lang: Lang, id: string) => href(lang, `/planet/${id}/`);

/** Station sections live on the localized home page. */
export const stationHref = (lang: Lang, target: string) => target.startsWith('#') ? href(lang, '/') + target : target.startsWith('/') && !target.startsWith('//') ? href(lang, target) : target;

/** The kinds of world a planet can be (surface.look), named for people. */
export const LOOK_NAMES: Record<string, L> = {
  terra: { en: 'Ocean world', zh: '海洋星球' },
  gas: { en: 'Gas giant', zh: '气态巨行星' },
  rock: { en: 'Cratered rock', zh: '陨石坑岩石星' },
  storm: { en: 'Storm world', zh: '风暴星球' },
  city: { en: 'City world', zh: '城市星球' },
  lava: { en: 'Lava world', zh: '熔岩星球' },
  ice: { en: 'Crystal world', zh: '晶体星球' },
  dunes: { en: 'Dune world', zh: '沙丘星球' },
};
const LOOK_OF_STYLE: Record<string, string> = { bands: 'gas', craters: 'rock', grid: 'city', swirl: 'storm', patches: 'terra' };

/** Short facts about a planet's globe, from its `surface`: kind of world, size, ring, moons. */
export function worldFacts(s: { style: string; look?: string; size?: number; ring?: boolean; moons?: number; clouds?: boolean }, lang: Lang): string[] {
  const zh = lang === 'zh';
  const look = s.look ?? LOOK_OF_STYLE[s.style] ?? 'terra';
  const out = [LOOK_NAMES[look][lang]];
  const size = s.size ?? 1;
  if (size >= 1.15) out.push(zh ? `${size.toFixed(2).replace(/0$/, '')} 倍大小` : `${size.toFixed(2).replace(/0$/, '')}× size`);
  else if (size <= 0.9) out.push(zh ? `偏小（${size.toFixed(2).replace(/0$/, '')} 倍）` : `Small (${size.toFixed(2).replace(/0$/, '')}×)`);
  if (look === 'terra' || s.clouds) out.push(zh ? '有云层' : 'Clouds');
  if (s.ring) out.push(zh ? '有星环' : 'Ringed');
  if (s.moons) out.push(zh ? `${s.moons} 颗卫星` : s.moons === 1 ? '1 moon' : `${s.moons} moons`);
  return out;
}
