// Renders the agent replays in data/replays.yaml.
//
// A replay is a kition-showcase sample (a list of real kit commands). For each
// frame this runs the first `upto` commands through the kit's own `showcase`
// example and keeps the picture the kit renders, so every frame is what the kit
// really draws after those commands. Output, per replay:
//
//   public/assets/replay/<kit>/<scenario>/<n>.webp   the frames
//   public/assets/replay/<kit>/<scenario>/replay.json the commands, grouped by frame
//   public/assets/replay/manifest.json               what the pages read
//
// Needs the sibling checkouts (kition-showcase, the kit repositories, kition-fonts)
// and each kit's runner: `cargo build --release -p kition-<kit>-kit --example showcase`.
// A replay whose kit has no runner, or whose render fails, is left out and reported.
//
//   node scripts/build-replays.mjs            build everything
//   node scripts/build-replays.mjs sheet doc  only these kits (others keep their built files)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from 'js-yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const KITION_ROOT = path.resolve(process.env.KITION_ROOT ?? path.join(ROOT, '..'));
const SHOWCASE = path.join(KITION_ROOT, 'kition-showcase');
const OUT = path.join(ROOT, 'public/assets/replay');
const WIDTH = 960; // longest side of a frame, in pixels
const only = process.argv.slice(2);

const { KITS, FONTS } = await import(path.join(SHOWCASE, 'tools/kits.mjs'));
const entries = load(fs.readFileSync(path.join(ROOT, 'data/replays.yaml'), 'utf8'));
const manifestFile = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};

const git = (repo, ...args) => {
  try {
    return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

/** A command's arguments in a few words: enough to recognise it, never the whole payload. */
function brief(params) {
  if (!params || typeof params !== 'object') return '';
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    let text;
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) text = Array.isArray(value[0]) ? `${value.length} rows` : value.length <= 3 && value.every((v) => typeof v !== 'object') ? value.join(', ') : `${value.length} items`;
    else if (typeof value === 'object') text = '{…}';
    else text = String(value);
    if (text.length > 28) text = `${text.slice(0, 27)}…`;
    parts.push(`${key}: ${text}`);
    if (parts.join(', ').length > 60) break;
  }
  const out = parts.join(', ');
  return out.length > 72 ? `${out.slice(0, 71)}…` : out;
}

function render(sample, kit, upto, file, work) {
  const cfg = KITS[kit];
  const thumbnail = sample.thumbnail ?? {};
  const seek = thumbnail.at === undefined || !cfg.seek ? [] : [{ command: cfg.seek, params: { [cfg.seekParam ?? 'seconds']: thumbnail.at } }];
  const prelude = sample.prelude ? cfg.preludes?.[sample.prelude] ?? [] : [];
  // A sample's thumbnail may show something a later command makes (a view saved `as: open`).
  // Before that command has run there is nothing to show yet: the kit draws its default view.
  const steps = [...prelude, ...sample.steps.slice(0, upto)];
  const made = new Set(steps.map((step) => step.as).filter(Boolean));
  const viewSteps = (thumbnail.steps ?? []).filter((step) => [...JSON.stringify(step).matchAll(/\$([A-Za-z_][\w-]*)/g)].every((m) => made.has(m[1])));
  const request = {
    create: { name: sample.document.name, width: sample.document.width, height: sample.document.height },
    fonts: (sample.fonts ?? cfg.defaultFonts ?? []).map((font) => path.join(FONTS, font)),
    steps,
    save: path.join(work, sample.document.name),
    renders: [{ file, max: WIDTH, area: thumbnail.area ?? cfg.thumbnailArea ?? null, steps: [...seek, ...viewSteps] }],
    frames: null,
    inspect: path.join(work, 'inspect.json'),
  };
  const requestFile = path.join(work, `request-${upto}.json`);
  fs.writeFileSync(requestFile, JSON.stringify(request));
  const epoch = String(Math.floor(Date.parse(`${sample.since}T00:00:00Z`) / 1000));
  const run = spawnSync(path.join(KITION_ROOT, cfg.repo, 'target/release/examples/showcase'), [requestFile], { encoding: 'utf8', env: { ...process.env, SOURCE_DATE_EPOCH: epoch, ...cfg.env } });
  let report;
  try {
    report = JSON.parse(run.stdout.trim().split('\n').at(-1));
  } catch {
    report = { error: `no report (exit ${run.status}): ${(run.stderr || '').trim().split('\n').slice(-3).join(' / ')}` };
  }
  if (report.error) throw new Error(`render after ${upto} commands: ${report.error}`);
  return report.renders[0].size;
}

let built = 0;
const problems = [];
for (const entry of entries) {
  const id = `${entry.kit}/${entry.scenario}`;
  if (only.length && !only.includes(entry.kit)) continue;
  const cfg = KITS[entry.kit];
  const runner = path.join(KITION_ROOT, cfg.repo, 'target/release/examples/showcase');
  const sampleFile = path.join(SHOWCASE, entry.sample, 'showcase.yaml');
  const dir = path.join(OUT, entry.kit, entry.scenario);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ku-replay-'));
  try {
    if (!fs.existsSync(runner)) throw new Error(`no runner: build it in ${cfg.repo} (cargo build --release -p ${cfg.package} --example showcase)`);
    if (!fs.existsSync(sampleFile)) throw new Error(`no sample ${entry.sample}`);
    const sample = load(fs.readFileSync(sampleFile, 'utf8'));
    const total = sample.steps.length;
    if (entry.frames.at(-1).upto !== total) throw new Error(`last frame must be upto ${total} (the sample's commands), got ${entry.frames.at(-1).upto}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const frames = [];
    let from = 0;
    for (const [index, frame] of entry.frames.entries()) {
      const png = path.join(work, `${index + 1}.png`);
      const [w, h] = render(sample, entry.kit, frame.upto, png, work);
      const img = `${index + 1}.webp`;
      execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', path.join(dir, img)]);
      frames.push({
        img, w, h, say: frame.say, lights: frame.lights,
        steps: sample.steps.slice(from, frame.upto).map((step) => ({ c: step.command, a: brief(step.params) })),
      });
      from = frame.upto;
    }
    const commit = git(path.join(KITION_ROOT, cfg.repo), 'rev-parse', '--short=10', 'HEAD');
    const base = { kit: entry.kit, scenario: entry.scenario, sample: entry.sample, title: sample.title, file: sample.document.name, goal: entry.goal, commands: total, commit };
    fs.writeFileSync(path.join(dir, 'replay.json'), JSON.stringify({ ...base, frames }));
    manifest[id] = { ...base, frames: frames.map((f) => ({ img: f.img, w: f.w, h: f.h, say: f.say, lights: f.lights, steps: f.steps.length })) };
    built += 1;
    console.log(`✓ ${id}  ${entry.sample}  ${frames.length} frames, ${total} commands`);
  } catch (error) {
    delete manifest[id];
    fs.rmSync(dir, { recursive: true, force: true });
    problems.push(`✗ ${id} (${entry.sample}): ${error.message}`);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
// entries removed from replays.yaml leave the manifest too
const known = new Set(entries.map((entry) => `${entry.kit}/${entry.scenario}`));
for (const id of Object.keys(manifest)) if (!known.has(id)) delete manifest[id];
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(manifestFile, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))), null, 1)}\n`);
for (const problem of problems) console.error(problem);
console.log(`${built} replays built, ${problems.length} left out, ${Object.keys(manifest).length} in the manifest`);
