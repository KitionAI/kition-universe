// Reads a submission made with one of the issue forms and checks it against
// CONTRIBUTING.md. It prints what is wrong (if anything) and the entry a
// maintainer would add: YAML for data/products.yaml, or a line for
// src/lib/scenarioGalaxies.ts. It changes no file.
//
//   node scripts/intake.mjs product issue.md          a product planet (form: built-with-kition.yml)
//   node scripts/intake.mjs galaxy issue.md           a scenario galaxy (form: scenario-galaxy.yml)
//   node scripts/intake.mjs product - < issue.md      the same, from stdin
//   --fetch    product only: also open the product URL and look for the badge link (needs the network)
//   --markdown print the report as a GitHub comment
//
// Exit status: 0 when the submission passes, 1 when it has problems, 2 when it cannot be read.
import fs from 'node:fs';
import path from 'node:path';
import { load, dump } from 'js-yaml';
import { KIT_IDS } from '../src/lib/kits.ts';
import { scenarioGalaxies } from '../src/lib/scenarioGalaxies.ts';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [kind, file] = args.filter((a) => !a.startsWith('--'));
if (!['product', 'galaxy'].includes(kind) || !file) {
  console.error('usage: node scripts/intake.mjs product|galaxy <issue.md | -> [--fetch] [--markdown]');
  process.exit(2);
}
const body = fs.readFileSync(file === '-' ? 0 : file, 'utf8').replace(/\r\n/g, '\n');

// ---- the form: "### Label" then the answer; an empty answer is "_No response_" ----
const fields = new Map();
for (const part of body.split(/^### /m).slice(1)) {
  const [label, ...rest] = part.split('\n');
  const value = rest.join('\n').trim();
  fields.set(label.trim(), value === '_No response_' ? '' : value);
}
const text = (label) => (fields.get(label) ?? '').replace(/^```\w*\n?|\n?```$/g, '').trim();
const ticked = (label) => [...(fields.get(label) ?? '').matchAll(/^- \[[xX]\] (.+)$/gm)].map((m) => m[1].trim());

const problems = [];
const notes = [];
const need = (label) => {
  const v = text(label);
  if (!v) problems.push(`"${label}" is empty`);
  return v;
};
const MARKS = /Office|Adobe|Photoshop|Illustrator|After Effects|AutoCAD|Excel|PowerPoint|InDesign|Figma|Notion/;
const PAID = /\b(sponsored|promoted|featured|advert(isement)?|ad slot)\b|赞助|推广|置顶|广告/i;
const HYPE = /revolutionary|game[- ]changing|world[- ]class|best[- ]in[- ]class|\bthe best\b|#1\b|颠覆|最强|第一名/i;
const NUMBERS = /\b\d[\d,.]*\s*(k|m|million|thousand)?\+?\s*(users|customers|downloads|teams|companies|stars)\b|\d+\s*(万|千)?\s*(用户|客户|下载)/i;
const isUrl = (v) => /^https:\/\/[^\s]+$/.test(v);
const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v);
const slug = (v) => v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const claims = (label, v) => {
  if (PAID.test(v)) problems.push(`"${label}" has paid-placement wording`);
  if (HYPE.test(v)) problems.push(`"${label}" has promotional wording; say what it does instead`);
  if (NUMBERS.test(v)) problems.push(`"${label}" has a user or download count; we do not publish numbers`);
};
const today = new Date().toISOString().slice(0, 10);
const universe = load(fs.readFileSync(path.resolve('data/universe.yaml'), 'utf8'));
const scenarios = load(fs.readFileSync(path.resolve('data/scenarios.yaml'), 'utf8'));
let entry = '';
let where = '';

if (kind === 'product') {
  const LOOKS = ['terra', 'gas', 'rock', 'storm', 'city', 'lava', 'ice', 'dunes'];
  const existing = (load(fs.readFileSync(path.resolve('data/products.yaml'), 'utf8'))?.products ?? []);
  const name = need('Product name');
  const url = need('Product URL');
  const tagline = need('Tagline (English)');
  const description = need('Description (English)');
  const kits = ticked('Kits it uses').filter((k) => KIT_IDS.includes(k)).sort((a, b) => KIT_IDS.indexOf(a) - KIT_IDS.indexOf(b));
  const delivery = ticked('How it uses them (Kition SDK delivery)').map((l) => l.split(/\s/)[0]).filter((d) => ['embed', 'script', 'headless', 'mcp'].includes(d));
  const category = need('Category');
  const authorName = need('Author name');
  const id = slug(name);
  if (name && !id) problems.push('the product name gives no usable id (it needs some Latin letters or digits)');
  if (['badge', 'submit'].includes(id)) problems.push(`the id "${id}" is reserved`);
  if (existing.some((p) => p.id === id)) problems.push(`a product with the id "${id}" is already listed`);
  if (existing.some((p) => p.url && url && p.url.replace(/\/$/, '') === url.replace(/\/$/, ''))) problems.push('this URL is already listed');
  if (url && !isUrl(url)) problems.push('"Product URL" must be an https URL');
  if (MARKS.test(name)) problems.push('the product name contains another company’s trademark');
  if (tagline.length > 200) problems.push(`the tagline is ${tagline.length} characters; the limit is 200`);
  for (const label of ['Product name', 'Tagline (English)', 'Tagline (Chinese, optional)', 'Description (English)', 'Description (Chinese, optional)']) claims(label, text(label));
  if (!kits.length) problems.push('no kit is ticked');
  if (!delivery.length) problems.push('no delivery form is ticked');
  if (category && !['office', 'design', 'video', 'engineering', 'education', 'developer-tools', 'ai-agent', 'other'].includes(category)) problems.push(`unknown category "${category}"`);
  for (const label of ['Author URL (optional)', 'Open source repository (optional)']) if (text(label) && !isUrl(text(label))) problems.push(`"${label}" must be an https URL`);
  if (text('Author GitHub user or organisation (optional)') && !/^[A-Za-z0-9-]+$/.test(text('Author GitHub user or organisation (optional)'))) problems.push('"Author GitHub user or organisation" must be a GitHub name');
  const agreed = ticked('Listing conditions');
  if (agreed.length < 2) problems.push('both listing conditions must be ticked');

  const look = text('Planet look').split(/\s/)[0];
  const color = text('Planet colour (optional)');
  if (color && !isHex(color)) problems.push('"Planet colour" must look like #4fd8c8');
  const planet = {};
  if (LOOKS.includes(look)) planet.look = look;
  if (isHex(color)) planet.color = color.toLowerCase();
  if (text('Planet ring') === 'Ring') planet.ring = true;
  if (['1', '2'].includes(text('Planet moons'))) planet.moons = Number(text('Planet moons'));

  if (flags.has('--fetch') && isUrl(url)) {
    // the one condition for listing: the page is public and carries the badge linking back
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'kition-universe-intake' } });
      if (!res.ok) problems.push(`the product URL answers ${res.status}`);
      else {
        const html = await res.text();
        if (!/universe\.kition\.ai/i.test(html)) problems.push('no link back to universe.kition.ai was found on the product page (the Built with Kition badge)');
        else if (!/built[\s-]with[\s-]kition/i.test(html)) notes.push('the page links back, but the words "Built with Kition" were not found; a maintainer will look at the badge');
      }
    } catch (error) {
      problems.push(`the product URL did not answer (${error.cause?.code ?? error.message})`);
    }
  } else notes.push('the badge on the product page was not checked here; a maintainer checks it');
  if (!text('Tagline (Chinese, optional)')) notes.push('no Chinese tagline: the English one is shown on the Chinese pages');
  if (!text('Screenshot (optional)')) notes.push('no screenshot: a maintainer may take one of the public page (1600×1000 webp under public/assets/products/)');
  else notes.push('screenshot attached: a maintainer converts it to 1600×1000 webp under public/assets/products/ and adds `screenshot:`');

  const collab = text('Collaboration').split(/\s/)[0];
  const author = { name: authorName };
  if (text('Author URL (optional)')) author.url = text('Author URL (optional)');
  if (text('Author GitHub user or organisation (optional)')) author.github = text('Author GitHub user or organisation (optional)');
  /** @type {Record<string, unknown>} */
  const item = { id, name, url, tagline };
  if (text('Tagline (Chinese, optional)')) item.tagline_zh = text('Tagline (Chinese, optional)');
  item.description = description;
  if (text('Description (Chinese, optional)')) item.description_zh = text('Description (Chinese, optional)');
  Object.assign(item, { kits, delivery });
  if (['none', 'cloud', 'server'].includes(collab)) item.collab = collab;
  Object.assign(item, { category, author });
  if (text('Open source repository (optional)')) item.open_source = text('Open source repository (optional)');
  if (Object.keys(planet).length) item.planet = planet;
  Object.assign(item, { badge_verified: false, editors_pick: false, status: 'live', added: today });
  entry = dump([item], { lineWidth: 110, flowLevel: 2, quotingType: '"' }).replace(/^/gm, '  ');
  where = 'data/products.yaml, at the end of `products:`';
} else {
  const name = need('Galaxy name (English)');
  const ask = need('Task phrase (English)');
  const summary = need('Summary (English)');
  const outcome = need('Outcome (English)');
  const form = need('Layout');
  const hub = text('Hub kit (hub layout only)');
  const color = text('Galaxy colour (optional)');
  const byName = need('Proposed by');
  const id = slug(name);
  if (name && !/^[a-z]+(-[a-z]+)*$/.test(id)) problems.push(`the name gives the id "${id}"; a galaxy id is lowercase words joined by -`);
  if (scenarioGalaxies.some((g) => g.id === id)) problems.push(`a galaxy with the id "${id}" already exists`);
  if (name.split(/\s+/).length > 4) problems.push('the galaxy name is longer than four words');
  if (MARKS.test(name)) problems.push('the galaxy name contains another company’s trademark');
  for (const label of ['Galaxy name (English)', 'Task phrase (English)', 'Summary (English)', 'Outcome (English)']) claims(label, text(label));
  if (!['lane', 'ring', 'binary', 'hub'].includes(form)) problems.push(`unknown layout "${form}"`);
  if (color && !isHex(color)) problems.push('"Galaxy colour" must look like #8fafff');
  // steps: "kit: scenario-id", two to four, each kit once, each a scenario the kit lists
  const steps = [];
  for (const line of text('Steps').split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = /^([a-z]+)\s*[:：]\s*([a-z0-9-]+)$/.exec(line);
    if (!m) { problems.push(`step "${line}" is not written as kit: scenario-id`); continue; }
    const [, kit, scenario] = m;
    if (!KIT_IDS.includes(kit)) problems.push(`step "${line}": there is no kit ${kit}`);
    else if (!scenarios[kit]?.some((sc) => sc.id === scenario)) problems.push(`step "${line}": ${kit} has no scenario ${scenario} (it has ${scenarios[kit].map((sc) => sc.id).join(', ')})`);
    steps.push({ kit, scenario });
  }
  if (steps.length < 2 || steps.length > 4) problems.push(`a galaxy has two to four steps; this one has ${steps.length}`);
  if (new Set(steps.map((s) => s.kit)).size !== steps.length) problems.push('a kit appears in more than one step');
  const same = (g) => g.kits.length === steps.length && g.kits.every((k) => steps.some((s) => s.kit === k.kit && s.scenario === k.scenario));
  const twin = scenarioGalaxies.find(same);
  if (twin) problems.push(`the galaxy "${twin.name.en}" already has exactly these steps`);
  if (form === 'hub' && !steps.some((s) => s.kit === hub)) problems.push('a hub layout needs "Hub kit" to be one of the steps');
  if (form !== 'hub' && hub) notes.push('"Hub kit" is ignored: the layout is not hub');
  if (text('Your URL (optional)') && !isUrl(text('Your URL (optional)'))) problems.push('"Your URL" must be an https URL');
  if (text('Your GitHub user or organisation (optional)') && !/^[A-Za-z0-9-]+$/.test(text('Your GitHub user or organisation (optional)'))) problems.push('"Your GitHub user or organisation" must be a GitHub name');
  if (ticked('Conditions').length < 2) problems.push('both conditions must be ticked');
  const missingZh = ['Galaxy name (Chinese, optional)', 'Task phrase (Chinese, optional)', 'Summary (Chinese, optional)', 'Outcome (Chinese, optional)'].filter((l) => !text(l));
  if (missingZh.length) notes.push('Chinese text is missing for some fields: a maintainer translates them before merging (marked TODO below)');
  if (!color) notes.push('no colour given: a maintainer picks one that no other galaxy uses');
  else if (scenarioGalaxies.some((g) => g.color.toLowerCase() === color.toLowerCase())) notes.push('another galaxy already has this colour; a maintainer may adjust it');

  // a free place on the map: the spot furthest from every galaxy, on the ring outside the existing ones
  const taken = [[0, 0, 0], universe.productGalaxy.position, ...scenarioGalaxies.map((g) => g.position)];
  const reach = Math.max(...taken.map((p) => Math.hypot(p[0], p[2])));
  let best = [0, 0, 0], bestGap = -1;
  for (const r of [reach * 0.75, reach, reach + 110]) for (let a = 0; a < 360; a += 6) {
    const p = [Math.round(Math.cos((a * Math.PI) / 180) * r), 0, Math.round(Math.sin((a * Math.PI) / 180) * r)];
    const gap = Math.min(...taken.map((t) => Math.hypot(t[0] - p[0], t[2] - p[2])));
    if (gap > bestGap) { bestGap = gap; best = p; }
  }
  if (bestGap < 110) notes.push(`the nearest free place is ${Math.round(bestGap)} units from its neighbour (galaxies are about 85 across): a maintainer should check the map`);

  const q = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const zh = (label) => q(text(label) || 'TODO');
  const by = [`name:${q(byName)}`, text('Your URL (optional)') && `url:${q(text('Your URL (optional)'))}`, text('Your GitHub user or organisation (optional)') && `github:${q(text('Your GitHub user or organisation (optional)'))}`].filter(Boolean).join(', ');
  entry = [
    `  { id:${q(id)}, form:${q(form)},${form === 'hub' ? ` hub:${q(hub)},` : ''} name:c(${q(name)},${zh('Galaxy name (Chinese, optional)')}), color:${q(color || '#TODO')}, position:[${best.join(',')}], summary:c(${q(summary)},${zh('Summary (Chinese, optional)')}), outcome:c(${q(outcome)},${zh('Outcome (Chinese, optional)')}), kits:[${steps.map((s) => `k(${q(s.kit)},${q(s.scenario)})`).join(',')}], by:{ ${by} }, added:${q(today)} },`,
    '',
    '  // and in scenarioAsks:',
    `  ${q(id)}: c(${q(ask)}, ${zh('Task phrase (Chinese, optional)')}),`,
  ].join('\n');
  where = 'src/lib/scenarioGalaxies.ts: the first line at the end of `scenarioGalaxies`, the second in `scenarioAsks`';
}

const ok = problems.length === 0;
if (flags.has('--markdown')) {
  const out = [ok ? '**Automated check: passed.** A maintainer will review it next.' : '**Automated check: this submission needs changes.** Edit the issue and the check runs again.', ''];
  if (problems.length) out.push('Problems:', ...problems.map((p) => `- ${p}`), '');
  if (notes.length) out.push('Notes:', ...notes.map((n) => `- ${n}`), '');
  if (ok) out.push(`<details><summary>Entry for a maintainer (${where})</summary>`, '', `\`\`\`${kind === 'product' ? 'yaml' : 'ts'}`, entry.replace(/\n$/, ''), '```', '', '</details>', '');
  out.push('The rules are in [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md). This check reads the form only; it does not decide whether the submission is listed.');
  console.log(out.join('\n'));
} else {
  for (const p of problems) console.log(`✗ ${p}`);
  for (const n of notes) console.log(`· ${n}`);
  if (ok) console.log(`✓ passes the form check\n\nEntry (${where}):\n\n${entry}`);
}
process.exit(ok ? 0 : 1);
