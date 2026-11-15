// Agent replays: a kition-showcase sample (real kit commands) replayed frame by
// frame. data/replays.yaml says which sample stands for which scenario and
// where the frames fall; scripts/build-replays.mjs runs those commands through
// the kit and writes the pictures and command lists under public/assets/replay/.
// Only replays that have been built are offered: the manifest is the truth.
import fs from 'node:fs';
import path from 'node:path';
import { withBase } from './base.ts';
import { planet, t, type L, type Lang } from './universe.ts';

export interface ReplayManifestEntry {
  kit: string;
  scenario: string;
  sample: string; // kition-showcase id
  title: string; // the sample's title
  file: string; // the document the commands build, e.g. "orders.xlsx"
  goal: L;
  commands: number;
  frames: { img: string; w: number; h: number; say: L; lights: string[]; steps: number }[];
  /** kit repository commit the frames were rendered with */
  commit: string;
}

let cache: Record<string, ReplayManifestEntry> | undefined;

export function replays(): Record<string, ReplayManifestEntry> {
  if (cache) return cache;
  const file = path.resolve(process.cwd(), 'public/assets/replay/manifest.json');
  cache = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, ReplayManifestEntry>) : {};
  return cache;
}

export const replayId = (kit: string, scenario: string) => `${kit}/${scenario}`;
export const replayFor = (kit: string, scenario: string): ReplayManifestEntry | undefined => replays()[replayId(kit, scenario)];
export const replaysOf = (kit: string): ReplayManifestEntry[] => Object.values(replays()).filter((r) => r.kit === kit);
export const replayAsset = (r: ReplayManifestEntry, file: string) => withBase(`/assets/replay/${r.kit}/${r.scenario}/${file}`);
/** The finished picture: the last frame. */
export const replayThumb = (r: ReplayManifestEntry) => replayAsset(r, r.frames[r.frames.length - 1].img);

/** What a page hands the client to start a replay (the command list is fetched on demand). */
export interface ReplayRef {
  id: string;
  kit: string;
  kitName: string;
  color: string;
  title: string;
  goal: string;
  thumb: string;
  frames: number;
  commands: number;
  src: string; // replay.json
}

export function replayRef(r: ReplayManifestEntry, lang: Lang): ReplayRef {
  const p = planet(r.kit);
  const sc = p.scenarios.find((s) => s.id === r.scenario);
  return {
    id: replayId(r.kit, r.scenario),
    kit: r.kit,
    kitName: p.name,
    color: p.color.dark,
    title: sc ? t(sc.title, lang) : r.title,
    goal: t(r.goal, lang),
    thumb: replayThumb(r),
    frames: r.frames.length,
    commands: r.commands,
    src: replayAsset(r, 'replay.json'),
  };
}
