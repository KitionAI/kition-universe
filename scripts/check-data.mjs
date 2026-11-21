// Guards for data/universe.yaml, data/products.yaml and the built site. Run: pnpm check:data [--dist]
import fs from 'node:fs';
import path from 'node:path';
import { load, JSON_SCHEMA } from 'js-yaml';
import { KIT_IDS } from '../src/lib/kits.ts';
import { scenarioGalaxies, scenarioAsks } from '../src/lib/scenarioGalaxies.ts';

const ORDER = [...KIT_IDS];
const LINES = {
  office: ['note', 'table', 'board', 'doc', 'sheet', 'slide', 'pdf', 'html'],
  design: ['photo', 'vector', 'layout', 'design'],
  video: ['film', 'motion'],
  cad: ['cad', 'scene'],
};
const LOOKS = ['terra', 'gas', 'rock', 'storm', 'city', 'lava', 'ice', 'dunes'];
// exactly these kits are Preview; the others carry no maturity label (never "Beta")
const PREVIEW = ['html', 'design', 'scene'];
const BANNED = [/revolutionary/i, /game[- ]changing/i, /\bsubscribe\b/i, /Word kit/i, /Markdown kit/i];
// trademark names may only appear in comparison copy, never as planet or building names
const MARKS = /Office|Adobe|Photoshop|Illustrator|After Effects|AutoCAD|Excel|PowerPoint|InDesign/;

const errors = [];
const u = load(fs.readFileSync(path.resolve('data/universe.yaml'), 'utf8'));
const ids = [...u.planets].sort((a, b) => a.order - b.order).map((p) => p.id);
if (ids.join() !== ORDER.join()) errors.push(`planet order must be ${ORDER.join(', ')}; got ${ids.join(', ')}`);
for (const [line, kits] of Object.entries(LINES)) {
  const got = u.planets.filter((p) => p.cluster === line).map((p) => p.id);
  if (got.sort().join() !== [...kits].sort().join()) errors.push(`cluster ${line} must hold ${kits.join(', ')}; got ${got.join(', ')}`);
}
for (const p of u.planets) {
  if (p.status !== undefined && p.status !== 'preview') errors.push(`${p.id}: status may only be preview (or left out)`);
  if ((p.status === 'preview') !== PREVIEW.includes(p.id)) errors.push(`${p.id}: preview status mismatch`);
  if (PREVIEW.includes(p.id) && !p.surface?.scaffold) errors.push(`${p.id}: preview planets need scaffolding`);
  for (const k of ['planet', 'world', 'tagline', 'summary', 'ship']) if (!p[k]?.en || !p[k]?.zh) errors.push(`${p.id}: missing ${k} en/zh`);
  // the description of the globe must not promise what `surface` does not draw
  const s = p.surface ?? {};
  if (s.look && !LOOKS.includes(s.look)) errors.push(`${p.id}: unknown surface.look ${s.look} (${LOOKS.join(' | ')})`);
  if (s.size !== undefined && !(s.size >= 0.8 && s.size <= 1.35)) errors.push(`${p.id}: surface.size must be 0.8 to 1.35`);
  if (s.moons !== undefined && !(Number.isInteger(s.moons) && s.moons >= 0 && s.moons <= 2)) errors.push(`${p.id}: surface.moons must be 0, 1 or 2`);
  const says = (re) => re.test(p.world?.en ?? '');
  if (says(/\bmoons?\b/i) !== !!s.moons) errors.push(`${p.id}: world mentions a moon but surface.moons is ${s.moons ?? 0} (or the reverse)`);
  if (says(/\bring\b/i) !== !!s.ring) errors.push(`${p.id}: world mentions a ring but surface.ring is ${!!s.ring} (or the reverse)`);
  if (says(/scaffolding/i) !== !!s.scaffold) errors.push(`${p.id}: world mentions scaffolding but surface.scaffold is ${!!s.scaffold} (or the reverse)`);
  if (!p.capabilities?.length) errors.push(`${p.id}: no capabilities`);
  for (const c of p.capabilities || []) {
    if (MARKS.test(c.building.en) || MARKS.test(c.building.zh)) errors.push(`${p.id}/${c.id}: trademark in building name`);
    for (const k of ['building', 'title', 'body']) if (!c[k]?.en || !c[k]?.zh) errors.push(`${p.id}/${c.id}: missing ${k}`);
  }
  if (MARKS.test(p.planet.en)) errors.push(`${p.id}: trademark in planet name`);
  if (!p.sources?.length) errors.push(`${p.id}: no sources`);
}

const text = fs.readFileSync(path.resolve('data/universe.yaml'), 'utf8');
for (const re of BANNED) if (re.test(text)) errors.push(`data contains banned wording ${re}`);

// ---- data/scenarios.yaml (what you can make, holograms over each city) ----
const ARTS = [...fs.readFileSync(path.resolve('src/scripts/scene/scenarioArt.ts'), 'utf8').matchAll(/^  '([a-z-]+)'\(c, K/gm)].map((m) => m[1]);
const scenariosText = fs.readFileSync(path.resolve('data/scenarios.yaml'), 'utf8');
const scenarios = load(scenariosText) || {};
for (const k of Object.keys(scenarios)) if (!ORDER.includes(k)) errors.push(`scenarios.yaml: unknown kit ${k}`);
for (const p of u.planets) {
  const list = scenarios[p.id] ?? [];
  if (list.length !== 3) errors.push(`scenarios.yaml: ${p.id} needs 3 scenarios, has ${list.length}`);
  const caps = new Set(p.capabilities.map((c) => c.id));
  for (const sc of list) {
    for (const k of ['title', 'body']) if (!sc[k]?.en || !sc[k]?.zh) errors.push(`scenarios.yaml: ${p.id}/${sc.id}: missing ${k} en/zh`);
    if (!ARTS.includes(sc.art)) errors.push(`scenarios.yaml: ${p.id}/${sc.id}: unknown art ${sc.art}`);
    if (!sc.uses?.length) errors.push(`scenarios.yaml: ${p.id}/${sc.id}: uses no capability`);
    for (const c of sc.uses ?? []) if (!caps.has(c)) errors.push(`scenarios.yaml: ${p.id}/${sc.id}: ${c} is not a capability of ${p.id}`);
    if (sc.template && !/^https:\/\/kition\.ai\/templates\//.test(sc.template)) errors.push(`scenarios.yaml: ${p.id}/${sc.id}: template must be a kition.ai/templates link`);
    if (MARKS.test(sc.title.en) || MARKS.test(sc.title.zh)) errors.push(`scenarios.yaml: ${p.id}/${sc.id}: trademark in title`);
  }
}
for (const re of BANNED) if (re.test(scenariosText)) errors.push(`scenarios.yaml contains banned wording ${re}`);

// ---- data/products.yaml (Built with Kition) ----
const galaxyIds = new Set();
const coveredKits = new Set();
for (const g of scenarioGalaxies) {
  if(galaxyIds.has(g.id) || !/^[a-z-]+$/.test(g.id)) errors.push(`galaxy ${g.id}: invalid or duplicate id`);
  galaxyIds.add(g.id);
  for(const key of ['name','summary','outcome']) if(!g[key]?.en || !g[key]?.zh) errors.push(`galaxy ${g.id}: missing ${key} translation`);
  if(g.position.length!==3 || g.position.some(n=>!Number.isFinite(n))) errors.push(`galaxy ${g.id}: invalid position`);
  if(g.kits.length<2 || new Set(g.kits.map(k=>k.kit)).size!==g.kits.length) errors.push(`galaxy ${g.id}: needs distinct kit combinations`);
  for(const k of g.kits) {
    coveredKits.add(k.kit);
    if(!scenarios[k.kit]?.some(sc=>sc.id===k.scenario)) errors.push(`galaxy ${g.id}: unknown scenario ${k.kit}/${k.scenario}`);
  }
}
for(const kit of ORDER) if(!coveredKits.has(kit)) errors.push(`scenario galaxies: kit ${kit} is never used`);
for (const g of scenarioGalaxies) {
  if (!['lane', 'ring', 'binary', 'hub'].includes(g.form)) errors.push(`galaxy ${g.id}: unknown form ${g.form}`);
  if (g.form === 'hub' && !g.kits.some((k) => k.kit === g.hub)) errors.push(`galaxy ${g.id}: hub ${g.hub} is not one of its kits`);
  if (!scenarioAsks[g.id]?.en || !scenarioAsks[g.id]?.zh) errors.push(`galaxy ${g.id}: missing task-bar phrase (scenarioAsks)`);
  if (!/^#[0-9a-fA-F]{6}$/.test(g.color)) errors.push(`galaxy ${g.id}: color must be #rrggbb`);
  if (g.kits.length > 4) errors.push(`galaxy ${g.id}: at most four steps`);
  if (JSON.stringify([g.name, g.summary, g.outcome, scenarioAsks[g.id]]).includes('TODO')) errors.push(`galaxy ${g.id}: a TODO is left in its text`);
  if (MARKS.test(g.name.en)) errors.push(`galaxy ${g.id}: trademark in its name`);
  // a contributed galaxy names who proposed it and when
  if (g.by) {
    if (!g.by.name) errors.push(`galaxy ${g.id}: by.name is required`);
    if (g.by.url && !/^https:\/\/[^\s]+$/.test(g.by.url)) errors.push(`galaxy ${g.id}: by.url must be an https URL`);
    if (g.by.github && !/^[A-Za-z0-9-]+$/.test(g.by.github)) errors.push(`galaxy ${g.id}: by.github must be a GitHub name`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.added ?? '')) errors.push(`galaxy ${g.id}: a contributed galaxy needs added: YYYY-MM-DD`);
  }
  // no two galaxies closer than they are wide
  for (const o of scenarioGalaxies) if (o !== g && Math.hypot(o.position[0] - g.position[0], o.position[2] - g.position[2]) < 100) errors.push(`galaxy ${g.id}: too close to ${o.id}`);
}

// ---- data/replays.yaml and the built replays (public/assets/replay) ----
// A replay is a kition-showcase sample; the frames are rendered by scripts/build-replays.mjs.
const replays = load(fs.readFileSync(path.resolve('data/replays.yaml'), 'utf8')) || [];
const replayIds = new Set();
const usedSamples = new Set();
const showcase = path.resolve(process.env.KITION_ROOT ?? '..', 'kition-showcase');
for (const r of replays) {
  const id = `${r.kit}/${r.scenario}`;
  const e = (msg) => errors.push(`replays.yaml: ${id}: ${msg}`);
  const p = u.planets.find((x) => x.id === r.kit);
  if (!p) { e('unknown kit'); continue; }
  if (replayIds.has(id)) e('listed twice');
  replayIds.add(id);
  if (!scenarios[r.kit]?.some((sc) => sc.id === r.scenario)) e('unknown scenario');
  if (typeof r.sample !== 'string' || !r.sample.startsWith(`${r.kit}/`)) e('sample must be a sample of the same kit');
  if (usedSamples.has(r.sample)) e(`sample ${r.sample} is used twice`);
  usedSamples.add(r.sample);
  if (!r.goal?.en || !r.goal?.zh) e('missing goal en/zh');
  if (!Array.isArray(r.frames) || !r.frames.length || r.frames.length > 5) e('needs 1 to 5 frames');
  const caps = new Set(p.capabilities.map((c) => c.id));
  let before = 0;
  for (const [i, f] of (r.frames ?? []).entries()) {
    if (!Number.isInteger(f.upto) || f.upto <= before) e(`frame ${i + 1}: upto must increase`);
    before = f.upto;
    if (!f.say?.en || !f.say?.zh) e(`frame ${i + 1}: missing say en/zh`);
    if (!f.lights?.length) e(`frame ${i + 1}: lights no building`);
    for (const c of f.lights ?? []) if (!caps.has(c)) e(`frame ${i + 1}: ${c} is not a capability of ${r.kit}`);
  }
  // with the showcase checkout next door, the last frame must be the whole sample
  const sampleFile = path.join(showcase, String(r.sample), 'showcase.yaml');
  if (fs.existsSync(sampleFile)) {
    const total = load(fs.readFileSync(sampleFile, 'utf8')).steps.length;
    if (before !== total) e(`last frame must be upto ${total} (the sample's commands)`);
  } else if (fs.existsSync(showcase)) e(`sample ${r.sample} not found in kition-showcase`);
}
for (const re of BANNED) if (re.test(JSON.stringify(replays))) errors.push(`replays.yaml contains banned wording ${re}`);
const manifestFile = path.resolve('public/assets/replay/manifest.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
for (const [id, m] of Object.entries(manifest)) {
  const entry = replays.find((r) => `${r.kit}/${r.scenario}` === id);
  if (!entry) { errors.push(`replay ${id}: built but no longer in replays.yaml (run node scripts/build-replays.mjs)`); continue; }
  if (entry.sample !== m.sample || entry.frames.length !== m.frames.length) errors.push(`replay ${id}: built from older data (run node scripts/build-replays.mjs ${m.kit})`);
  const dir = path.resolve('public/assets/replay', id);
  for (const f of ['replay.json', ...m.frames.map((x) => x.img)]) if (!fs.existsSync(path.join(dir, f))) errors.push(`replay ${id}: ${f} is missing`);
}
const kitsWithReplay = new Set(Object.values(manifest).map((m) => m.kit));

// ---- documentation links: each one goes to the page about that very thing ----
const DOC_HOSTS = /^https:\/\/(github\.com\/KitionAI\/|kitharness\.org\/|developer\.kition\.ai\/|kition\.ai\/)[^\s]+$/;
const docLinks = [['mcp.docs', u.mcp?.docs], ['productGalaxy.sdk.docs', u.productGalaxy?.sdk?.docs], ...(u.productGalaxy?.delivery ?? []).map((d) => [`delivery ${d.id}.docs`, d.docs])];
for (const [name, url] of docLinks) {
  if (!url) errors.push(`${name}: missing`);
  else if (!DOC_HOSTS.test(url)) errors.push(`${name}: must be a page on a Kition documentation site, got ${url}`);
  else if (/^https:\/\/[^/]+\/?$/.test(url)) errors.push(`${name}: links a home page, not the page about it`);
}
if (new Set(docLinks.map(([, url]) => url)).size < 4) errors.push('documentation links: the delivery forms must not all share one page');
if (process.argv.includes('--links')) {
  // ask each documentation page for its status (needs the network)
  for (const [name, url] of docLinks) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (!res.ok) errors.push(`${name}: ${url} answers ${res.status}`);
    } catch (error) {
      errors.push(`${name}: ${url} did not answer (${error.cause?.code ?? error.message})`);
    }
  }
}

// ---- data/products.yaml (Built with Kition) ----
const DELIVERY = ['embed', 'script', 'headless', 'mcp'];
const CATEGORY = ['office', 'design', 'video', 'engineering', 'education', 'developer-tools', 'ai-agent', 'other'];
const COLLAB = ['none', 'cloud', 'server'];
const STATUS = ['live', 'preview', 'paused'];
// ids that would clash with the static pages under /built-with/
const RESERVED = ['badge', 'submit'];
// paid placement of any kind is against the listing rules
const PAID = /\b(sponsored|promoted|featured|advert(isement)?|ad slot)\b|赞助|推广|置顶|广告/i;
const productsFile = path.resolve('data/products.yaml');
const productsText = fs.readFileSync(productsFile, 'utf8');
// keep dates as strings so the format check sees what was written
const pdata = load(productsText, { schema: JSON_SCHEMA }) || {};
const list = pdata.products ?? [];
if (!Array.isArray(list)) errors.push('products.yaml: `products` must be a list');
const seen = new Set();
const isUrl = (v) => typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
for (const [i, p] of (Array.isArray(list) ? list : []).entries()) {
  const id = p?.id ?? `#${i + 1}`;
  const e = (msg) => errors.push(`product ${id}: ${msg}`);
  for (const k of ['id', 'name', 'tagline', 'description', 'kits', 'delivery', 'category', 'author', 'status', 'added']) {
    if (p?.[k] === undefined || p[k] === null || p[k] === '') e(`missing ${k}`);
  }
  if (typeof p.id === 'string') {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) e('id must be lowercase letters, digits and dashes');
    if (RESERVED.includes(p.id)) e(`id "${p.id}" is reserved`);
    if (seen.has(p.id)) e('duplicate id');
    seen.add(p.id);
  }
  if (p.url !== undefined && !isUrl(p.url)) e('url must be an https URL');
  if (p.status !== 'preview' && !p.url) e('url is required for live and paused products');
  if (p.status === 'preview' && !p.by_kition) e('preview listings are for first-party products');
  if (p.status === 'preview' && !p.sources?.length) e('preview listings need sources');
  if (typeof p.name === 'string' && MARKS.test(p.name)) e('trademark in settlement name');
  if (typeof p.name === 'string' && PAID.test(p.name)) e('paid-placement wording in name');
  for (const k of ['tagline', 'tagline_zh', 'description', 'description_zh']) {
    if (p[k] !== undefined && typeof p[k] !== 'string') e(`${k} must be text`);
    if (typeof p[k] === 'string' && PAID.test(p[k])) e(`paid-placement wording in ${k}`);
  }
  if (typeof p.tagline === 'string' && p.tagline.length > 200) e('tagline longer than 200 characters');
  if (Array.isArray(p.kits)) {
    if (!p.kits.length) e('kits is empty');
    for (const k of p.kits) if (!ORDER.includes(k)) e(`unknown kit ${k}`);
    if (new Set(p.kits).size !== p.kits.length) e('kits has duplicates');
    const sorted = [...p.kits].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    if (p.kits.every((k) => ORDER.includes(k)) && sorted.join() !== p.kits.join()) e(`kits must be in the fixed order (${sorted.join(', ')})`);
  } else if (p.kits !== undefined) e('kits must be a list');
  if (Array.isArray(p.delivery)) {
    if (!p.delivery.length) e('delivery is empty');
    for (const d of p.delivery) if (!DELIVERY.includes(d)) e(`unknown delivery ${d} (${DELIVERY.join(' | ')})`);
    if (new Set(p.delivery).size !== p.delivery.length) e('delivery has duplicates');
  } else if (p.delivery !== undefined) e('delivery must be a list');
  if (p.category !== undefined && !CATEGORY.includes(p.category)) e(`unknown category ${p.category} (${CATEGORY.join(' | ')})`);
  if (p.collab !== undefined && !COLLAB.includes(p.collab)) e(`unknown collab ${p.collab} (${COLLAB.join(' | ')})`);
  if (p.status !== undefined && !STATUS.includes(p.status)) e(`unknown status ${p.status} (${STATUS.join(' | ')})`);
  for (const k of ['added', 'last_checked']) if (p[k] !== undefined && !isDate(p[k])) e(`${k} must be a YYYY-MM-DD date`);
  if (p.author !== undefined) {
    if (typeof p.author?.name !== 'string' || !p.author.name) e('author.name is required');
    if (p.author?.url !== undefined && !isUrl(p.author.url)) e('author.url must be an https URL');
    if (p.author?.github !== undefined && !/^[A-Za-z0-9-]+$/.test(String(p.author.github))) e('author.github must be a GitHub user or org name');
  }
  if (p.open_source !== undefined && !isUrl(p.open_source)) e('open_source must be an https URL');
  for (const k of ['by_kition', 'badge_verified', 'editors_pick']) if (p[k] !== undefined && typeof p[k] !== 'boolean') e(`${k} must be true or false`);
  for (const k of ['badge_verified', 'editors_pick']) if (p[k] === undefined) e(`missing ${k}`);
  if (p.screenshot !== undefined) {
    if (typeof p.screenshot !== 'string' || !p.screenshot.startsWith('/')) e('screenshot must be a path under public/, starting with /');
    else if (!fs.existsSync(path.join('public', p.screenshot))) e(`screenshot ${p.screenshot} not found under public/`);
  }
  if (p.sources !== undefined && !Array.isArray(p.sources)) e('sources must be a list');
  // the product's planet: a look, a colour, a ring, up to two moons; never a size (all product planets are equal)
  if (p.planet !== undefined) {
    const pl = p.planet;
    for (const k of Object.keys(pl)) if (!['look', 'color', 'ring', 'moons'].includes(k)) e(`planet.${k} is not a field (look | color | ring | moons)`);
    if (pl.look !== undefined && !LOOKS.includes(pl.look)) e(`unknown planet.look ${pl.look} (${LOOKS.join(' | ')})`);
    if (pl.color !== undefined && !/^#[0-9a-f]{6}$/.test(pl.color)) e('planet.color must be a lowercase #rrggbb colour');
    if (pl.ring !== undefined && typeof pl.ring !== 'boolean') e('planet.ring must be true or false');
    if (pl.moons !== undefined && ![0, 1, 2].includes(pl.moons)) e('planet.moons must be 0, 1 or 2');
  }
}
for (const re of BANNED) if (re.test(productsText)) errors.push(`products.yaml contains banned wording ${re}`);
for (const f of ['public/badge/built-with-kition-dark.svg', 'public/badge/built-with-kition-light.svg']) {
  if (!fs.existsSync(f)) errors.push(`${f} is missing`);
  else {
    const svg = fs.readFileSync(f, 'utf8');
    // the badge stays a plain picture: no scripts, no remote fetches, no tracking
    if (/<script|\son\w+=|<foreignObject|@import|url\(\s*['"]?https?:|(?:href|src)=["']https?:/i.test(svg)) errors.push(`${f}: scripts or external resources`);
    if (!svg.includes('Built with Kition')) errors.push(`${f}: must say "Built with Kition"`);
    if (MARKS.test(svg)) errors.push(`${f}: trademark in badge`);
  }
}

if (process.argv.includes('--dist')) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for(const lang of ['', 'zh/']) for(const g of scenarioGalaxies) {
    const file=`dist/${lang}scenarios/${g.id}/index.html`;
    if(!fs.existsSync(file)) {errors.push(`missing ${file}`);continue;}
    const html=fs.readFileSync(file,'utf8');
    for(const k of g.kits) {
      const target=`dist/${lang}planet/${k.kit}/index.html`;
      if(!html.includes(`#scenario-${k.scenario}`) || !fs.readFileSync(target,'utf8').includes(`id="scenario-${k.scenario}"`)) errors.push(`${file}: broken kit scenario ${k.kit}/${k.scenario}`);
    }
  }
  if(!fs.readFileSync('dist/index.html','utf8').includes('<html lang="en"')) errors.push('default homepage must be English');
  for (const f of walk('dist').filter((f) => /\.(html|txt|xml)$/.test(f))) {
    const html = fs.readFileSync(f, 'utf8');
    for (const re of BANNED) if (re.test(html)) errors.push(`${f}: banned wording ${re}`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ universe.yaml: ${u.planets.length} planets, ${u.clusters.length} clusters`);
console.log(`✓ scenario galaxies: ${scenarioGalaxies.length} combinations covering ${coveredKits.size} kits`);
console.log(`✓ replays: ${replays.length} listed, ${Object.keys(manifest).length} built, covering ${kitsWithReplay.size} of ${ORDER.length} kits`);
console.log(`✓ documentation links: ${docLinks.length}${process.argv.includes('--links') ? ' (all answer)' : ''}`);
console.log(`✓ products.yaml: ${list.length} product${list.length === 1 ? '' : 's'}`);
