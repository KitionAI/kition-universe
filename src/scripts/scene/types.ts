// Data the pages hand to the client scenes (serialized into a JSON <script>).
import type { Vec3 } from '../../lib/layout';

export interface ScenePlanet {
  id: string;
  name: string;
  nick: string;
  cluster: string;
  status: string;
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
  ship: string;
  href: string;
  /** home star map only: what the focus panel shows */
  tagline?: string;
  /** the globe in words, and short facts about it (kind of world, ring, moons) */
  world?: string;
  facts?: string[];
  replay?: { id: string; thumb: string; goal: string; frames: number };
  usedIn?: { id: string; name: string; color: string }[];
}

export interface UniverseSceneData {
  lang: 'en' | 'zh';
  strings: Record<string, string>;
  planets: ScenePlanet[];
  clusters: { id: string; angle: number; distance: number; label: string }[];
  stations: { id: string; kind: 'market' | 'ai' | 'ui'; name: string; title: string; body: string; cta: string; href: string; angle: number; distance: number; height: number }[];
  galaxies: { id: string; name: string; body: string; href: string; position: Vec3 }[];
  star: { name: string; short: string; tagline: string; lines: string[]; body: string; href: string; page: string };
  /** the agent tools reference (how an AI calls a kit) */
  agentDocs: string;
  /** the empty next orbit: contribute a kit */
  newKit: { name: string; title: string; body: string; cta: string; href: string; protocolPage: string; angle: number; distance: number; height: number };
  productGalaxy: ProductGalaxyData;
  scenarioGalaxies: SceneScenarioGalaxy[];
}

export interface SceneScenarioGalaxy {
  id: string;
  name: string;
  summary: string;
  outcome: string;
  color: string;
  position: Vec3;
  href: string;
  /** who proposed the galaxy, when it was contributed */
  by?: { name: string; url?: string };
  form: 'lane' | 'ring' | 'binary' | 'hub';
  /** index of the hub kit in `kits` (hub galaxies) */
  hub: number;
  kits: {
    id: string;
    title: string;
    body: string;
    href: string;
    status: string;
    /** the file this step leaves behind, e.g. ".xlsx" */
    ext: string;
    /** a replay of real kit commands for this step, when there is one */
    replay?: { id: string; thumb: string; goal: string; frames: number };
  }[];
}

export interface MissionGalaxyData {
  name: string;
  control: string;
  demo: string;
  description: string;
  explore: string;
  href: string;
  position: Vec3;
  missions: { id: string; title: string; summary: string; color: string; href: string; steps: { kit: string; title: string; file: string }[] }[];
}

export interface SceneProduct {
  id: string;
  name: string;
  tagline: string;
  kits: string[];
  delivery: string[];
  byKition: boolean;
  pick: boolean;
  href: string; // detail page
  url?: string; // the product itself, when publicly available
  statusLabel?: string;
  rel: string;
  /** its planet in the Product Galaxy */
  planet: { look: 'terra' | 'gas' | 'rock' | 'storm' | 'city' | 'lava' | 'ice' | 'dunes'; color: string; ring: boolean; moons: number };
}

export interface ProductGalaxyData {
  name: string;
  blurb: string;
  position: Vec3;
  sdk: { name: string; license: string; body: string; href: string; docs: string };
  delivery: { id: string; name: string; body: string; docs: string }[];
  add: { name: string; title: string; body: string; cta: string; href: string; badgeHref: string };
  listHref: string;
  products: SceneProduct[];
}

export interface PlanetSceneData {
  lang: 'en' | 'zh';
  strings: Record<string, string>;
  planet: ScenePlanet;
  buildings: { id: string; name: string; title: string; body: string; shape: string }[];
  /** what you can make with the kit, drawn as holograms over the city */
  scenarios: { id: string; title: string; body: string; art: string; uses: string[]; template?: string; replay?: { id: string; thumb: string } }[];
}
