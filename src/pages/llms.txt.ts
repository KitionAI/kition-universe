// llms.txt: the whole universe in plain text for AI readers.
import type { APIRoute } from 'astro';
import { universe, planetsIn, worldFacts } from '../lib/universe';
import { listedProducts } from '../lib/products';
import { scenarioGalaxies } from '../lib/scenarioGalaxies';
import { withBase } from '../lib/base';
import { replays } from '../lib/replays';

export const GET: APIRoute = ({ site }) => {
  const u = universe();
  const url = (p: string) => new URL(withBase(p), site).href;
  const out: string[] = [];
  out.push('# Kition Universe');
  out.push('');
  out.push(
    `> A star map of Kition, the open pro suite for AI. The kits, the Kition SDK and Kition Tessera are Apache-2.0; products built on them have their own licenses. ${u.planets.length} kits, each a planet, all built on the Kit Harness Protocol (KHP). This file lists every planet, what it really does, the files it works with, and how an AI agent uses it.`,
  );
  out.push('');
  out.push(u.star.lines.map((l) => l.en).join(' '));
  out.push('');
  out.push(`- [Star map](${url('/')}): the site (Chinese: [${url('/zh/')}](${url('/zh/')}))`);
  out.push(`- [Star catalog](${url('/catalog/')}): every planet as a plain list`);
  out.push(`- [Protocol overview](${url('/protocol/')}); spec at [kitharness.org](${u.star.href})`);
  out.push(`- [Kition](${u.site.links.main}); source at [GitHub](${u.site.links.github})`);
  out.push('');
  out.push('## Use the kits from an AI agent (MCP)');
  out.push('');
  out.push(u.mcp.intro.en);
  out.push('');
  out.push('```');
  out.push(u.mcp.snippet);
  out.push('```');
  out.push('');
  out.push(u.mcp.note.en);
  out.push('');
  out.push(`Every kit answers the same calls, prefixed with the kit name: <kit>_inspect, <kit>_commands, <kit>_run, <kit>_query, <kit>_batch, <kit>_check, <kit>_draft_ready, <kit>_draft_reopen. inspect and run return a rendered preview image.`);
  out.push('');
  for (const c of u.clusters) {
    out.push(`## ${c.name} (${c.label.en})`);
    out.push('');
    out.push(c.blurb.en);
    out.push('');
    for (const p of planetsIn(c.id)) {
      out.push(`### ${p.name} — ${p.planet.en}${p.status === 'preview' ? ' (Preview, under construction)' : ''}`);
      out.push('');
      out.push(`- Page: [${p.name}](${url(`/planet/${p.id}/`)})`);
      out.push(`- ${p.summary.en}`);
      out.push(`- On the star map: ${worldFacts(p.surface, 'en').join(', ')}. ${p.world.en}`);
      out.push(`- Native files: ${p.formats.native.join(', ')}${p.formats.opens.length ? `; also opens ${p.formats.opens.join(', ')}` : ''}`);
      if (p.status === 'preview' || p.version) out.push(`- ${[p.status === 'preview' ? 'Status: Preview' : '', p.version ? `Kit version ${p.version}` : ''].filter(Boolean).join(', ')}`);
      out.push(`- Capabilities: ${p.capabilities.map((x) => `${x.title.en} (${x.body.en.replace(/\.$/, '')})`).join('; ')}`);
      out.push(`- Example commands: ${p.commands.map((x) => `${x.name} (${x.what.en.toLowerCase()})`).join(', ')}`);
      out.push(`- What you can make: ${p.scenarios.map((x) => `${x.title.en}${x.template ? ` ([template](${x.template}))` : ''}`).join('; ')}`);
      out.push('');
    }
  }
  const pg = u.productGalaxy;
  out.push('## Built with Kition (the Product Galaxy)');
  out.push('');
  out.push(`${pg.blurb.en} ${pg.sdk.body.en.replace(/\s+/g, ' ')} SDK docs: [${pg.sdk.name}](${pg.sdk.docs}) (${pg.sdk.license}).`);
  out.push('');
  for (const d of pg.delivery) out.push(`- [${d.name}](${d.docs}): ${d.body.en}`);
  out.push('');
  out.push(`Product planets (products built on the kits; free listing, no paid ranking, every one the same size): [all product planets](${url('/built-with/')}), [add yours](${url('/built-with/submit/')}).`);
  out.push('');
  for (const p of listedProducts()) {
    out.push(`- [${p.name}](${url(`/built-with/${p.id}/`)})${p.by_kition ? ' (by Kition)' : ''}${p.status === 'preview' ? ' (Preview)' : ''}: ${p.tagline.replace(/\.?$/, '.')} Kits: ${p.kits.join(', ')}. Delivery: ${p.delivery.join(', ')}.`);
    if (p.status === 'preview') out.push(`  ${p.description.replace(/\s+/g, ' ')}`);
  }
  out.push('');
  out.push(`To add a planet instead, build a kit on KHP: ${u.newKit.body.en.replace(/\s+/g, ' ')}`);
  out.push('');
  out.push('## Scenario galaxies');
  out.push('');
  out.push(`[Scenario atlas](${url('/scenarios/')}). Twelve use-case galaxies composed from sixteen shared kits. Each links to the underlying kit examples and capabilities. This website is an explorable catalog, not an AI execution service.`);
  for (const g of scenarioGalaxies) out.push(`- [${g.name.en}](${url(`/scenarios/${g.id}/`)}): ${g.summary.en} Kits: ${g.kits.map(k=>k.kit).join(', ')}.`);
  out.push('');
  out.push('## Agent replays (recorded kit commands)');
  out.push('');
  out.push(`Each replay is a kition-showcase sample: the kit commands that build a document, in order, with the pictures the kit rendered after each group. An agent sends the same commands as steps of <kit>_run. Reference for these calls: ${u.mcp.docs}`);
  out.push('');
  for (const r of Object.values(replays())) {
    const p = u.planets.find((x) => x.id === r.kit)!;
    const sc = p.scenarios.find((x) => x.id === r.scenario);
    out.push(`- [${p.name}: ${sc?.title.en ?? r.title}](${url(`/planet/${p.id}/`)}#scenario-${r.scenario}): "${r.goal.en}" ${r.commands} commands on ${r.file}: ${r.frames.map((f) => f.say.en.replace(/\.$/, '')).join('; ')}. Result: ${url(`/assets/replay/${r.kit}/${r.scenario}/${r.frames[r.frames.length - 1].img}`)}; commands: ${url(`/assets/replay/${r.kit}/${r.scenario}/replay.json`)}`);
  }
  out.push('');
  out.push('## AI and UI');
  out.push('');
  for (const station of u.stations.filter((st) => st.id === 'ai' || st.id === 'ui')) out.push(`- ${station.name.en}: ${station.body.en}`);
  out.push(`- [Kition Tessera](${u.site.links.tessera}): design tokens, icons and professional editor components.`);
  out.push('');
  out.push('## Skills');
  out.push('');
  out.push(`The goal is a deep library of official Skills for every kit, each run for real with a preview image: [browse Skills](${u.site.links.skills})`);
  out.push('');
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
