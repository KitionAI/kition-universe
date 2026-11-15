// OG images, generated at build time: an SVG card with the planet drawn in its
// kit colour, rendered to PNG with resvg. One per page and language. Built with
// Kition pages get a settlement with one dot per kit it uses ("bw-{id}").
import type { APIRoute } from 'astro';
import { Resvg } from '@resvg/resvg-js';
import { universe, t, LANGS, type Lang, type Planet } from '../../lib/universe';
import { ui } from '../../i18n/ui';
import { products, tagline } from '../../lib/products';
import { bw } from '../../i18n/builtWith';
import { scenarioGalaxies } from '../../lib/scenarioGalaxies';

export function getStaticPaths() {
  const pages = ['home', 'catalog', 'protocol', 'missions', 'scenarios', ...scenarioGalaxies.map(g=>`scenario-${g.id}`), ...universe().planets.map((p) => p.id), 'built-with', ...products().map((p) => `bw-${p.id}`)];
  return pages.flatMap((page) => LANGS.map((lang) => ({ params: { name: lang === 'en' ? page : `${page}-${lang}` }, props: { page, lang } })));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** naive wrap: by words for latin text, by characters for CJK */
function wrap(text: string, max: number): string[] {
  const cjk = /[　-鿿]/.test(text);
  const units = cjk ? [...text] : text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const u of units) {
    const next = cur ? (cjk ? cur + u : `${cur} ${u}`) : u;
    const width = [...next].reduce((w, ch) => w + (/[　-鿿＀-￯]/.test(ch) ? 2 : 1), 0);
    if (width > max && cur) {
      lines.push(cur);
      cur = u;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > 3) lines[2] = lines[2].replace(/[\s,.;:，。；：]*$/, '') + '…';
  return lines.slice(0, 3);
}

/** a settlement: domes on a platform, ringed by the colours of the kits it uses */
function settlementArt(colors: string[], cx: number, cy: number) {
  const dots = colors
    .map((c, i) => {
      const a = (i / colors.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * 235;
      const y = cy - 10 + Math.sin(a) * 150;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${colors.length > 6 ? 17 : 24}" fill="${c}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${colors.length > 6 ? 17 : 24}" fill="url(#shade)"/>`;
    })
    .join('');
  const dome = (x: number, r: number, o: number) => `<path d="M${x - r} ${cy + 20} A${r} ${r} 0 0 1 ${x + r} ${cy + 20} Z" fill="#eceaff" fill-opacity="${o}" stroke="#b9b6ff" stroke-width="3"/>`;
  return `<ellipse cx="${cx}" cy="${cy - 10}" rx="235" ry="150" fill="none" stroke="#b9b6ff" stroke-opacity=".2" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="170" fill="url(#halo)"/>
    <ellipse cx="${cx}" cy="${cy + 26}" rx="150" ry="34" fill="#1d2050" stroke="#8b7cf0" stroke-width="3"/>
    ${dome(cx - 70, 44, 0.55)}${dome(cx + 72, 38, 0.45)}${dome(cx, 66, 0.8)}
    <rect x="${cx - 4}" y="${cy - 96}" width="8" height="52" rx="3" fill="#ffb347"/>
    ${dots}`;
}

function planetArt(p: Planet, cx: number, cy: number, r: number) {
  const c = p.color.dark;
  const ring = p.surface.ring ? `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.9}" ry="${r * 0.42}" fill="none" stroke="${c}" stroke-opacity=".55" stroke-width="14" transform="rotate(-12 ${cx} ${cy})"/>` : '';
  const scaffold =
    p.status === 'preview'
      ? `<g stroke="#ffa53d" stroke-width="5" stroke-dasharray="14 10" fill="none"><path d="M${cx - r * 1.15} ${cy + r} V${cy - r * 0.9} M${cx + r * 1.15} ${cy + r} V${cy - r * 0.9} M${cx - r * 1.15} ${cy - r * 0.2} H${cx + r * 1.15} M${cx - r * 1.15} ${cy + r * 0.55} H${cx + r * 1.15} M${cx - r * 1.15} ${cy - r * 0.2} L${cx + r * 1.15} ${cy + r * 0.55}"/></g>`
      : '';
  // little skyline on the planet's top edge
  const city = Array.from({ length: 9 }, (_, i) => {
    const a = -Math.PI / 2 + (i - 4) * 0.16;
    const h = 14 + ((i * 37) % 5) * 9;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const deg = (a * 180) / Math.PI + 90;
    return `<rect x="${x - 7}" y="${y - h}" width="14" height="${h + 4}" rx="2" fill="#f4f2ff" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
  return `${ring.replace('/>', ' />')}
    <circle cx="${cx}" cy="${cy}" r="${r * 1.25}" fill="url(#halo)"/>
    ${city}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#shade)"/>
    ${scaffold}`;
}

export const GET: APIRoute = ({ props }) => {
  const { page, lang } = props as { page: string; lang: Lang };
  const s = ui(lang);
  const u = universe();
  const p = u.planets.find((x) => x.id === page);
  let eyebrow = `Kition Universe · ${s('home.planetsTitle')}`;
  let title = 'Kition Universe';
  let sub = s('home.h1b');
  let art = '';
  let footer = 'The open pro suite for AI · Apache-2.0';
  const product = page.startsWith('bw-') ? products().find((x) => `bw-${x.id}` === page) : undefined;
  const scenario = scenarioGalaxies.find(g=>`scenario-${g.id}`===page);
  if (page === 'missions' || page === 'scenarios' || scenario) {
    eyebrow = 'KITION UNIVERSE · SCENARIO GALAXIES';
    title = scenario?.name[lang] || (lang==='zh'?'场景星系':'Scenario Galaxies');
    sub = scenario?.summary[lang] || (lang==='zh'?'12 个场景星系，由 16 个专业 Kit 组合而成。':'12 scenario galaxies. 16 shared professional kits.');
    footer = 'Kition Universe · A galaxy for every kind of work';
    art = settlementArt(scenario?scenario.kits.map(k=>u.planets.find(p=>p.id===k.kit)!.color.dark):scenarioGalaxies.map(g=>g.color), 930, 330);
  } else if (page === 'built-with' || product) {
    const b = bw(lang);
    footer = 'Built with Kition · Kition Universe';
    if (product) {
      eyebrow = `Built with Kition · ${product.by_kition ? b('bw.byKition') : b('bw.settlement')}`;
      if (product.status === 'preview') eyebrow += ` · ${b('bw.preview')}`;
      title = product.name;
      sub = tagline(product, lang);
      art = settlementArt(product.kits.map((k) => u.planets.find((x) => x.id === k)!.color.dark), 930, 330);
    } else {
      eyebrow = `Kition Universe · ${t(u.productGalaxy.name, lang)}`;
      title = 'Built with Kition';
      sub = t(u.productGalaxy.blurb, lang);
      art = settlementArt(u.planets.map((x) => x.color.dark), 930, 330);
    }
  } else if (p) {
    eyebrow = `Kition Universe · ${t(p.planet, lang)}`;
    title = `Kition ${p.name}`;
    sub = t(p.tagline, lang);
    art = planetArt(p, 930, 330, 170);
  } else {
    if (page === 'catalog') {
      title = s('catalog.h1');
      sub = s('catalog.sub');
    } else if (page === 'protocol') {
      title = u.star.name;
      sub = u.star.lines.map((l) => t(l, lang)).join(' ');
    }
    // A mini galaxy with every registered planet around the star.
    art = u.planets
      .map((x, i) => {
        const a = (i / u.planets.length) * Math.PI * 2 - 0.4;
        const R = 150 + (i % 3) * 38;
        const px = 930 + Math.cos(a) * R;
        const py = 330 + Math.sin(a) * R * 0.55;
        return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${x.status === 'preview' ? 15 : 19}" fill="${x.color.dark}"/>`;
      })
      .join('');
    art = `<ellipse cx="930" cy="330" rx="230" ry="128" fill="none" stroke="#b9b6ff" stroke-opacity=".18" stroke-width="2"/>
      <circle cx="930" cy="330" r="150" fill="url(#halo)"/><circle cx="930" cy="330" r="62" fill="url(#sun)"/>${art}`;
  }
  const font = lang === 'zh' ? "'PingFang SC', 'Noto Sans CJK SC', 'Hiragino Sans GB', sans-serif" : "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const titleLines = wrap(title, 17);
  const subLines = wrap(sub, lang === 'zh' ? 30 : 36);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="70%" cy="45%" r="90%"><stop offset="0" stop-color="#1b1d4a"/><stop offset=".55" stop-color="#0a0b1f"/><stop offset="1" stop-color="#04050c"/></radialGradient>
    <radialGradient id="sun" cx="42%" cy="38%" r="65%"><stop offset="0" stop-color="#fff6d0"/><stop offset=".45" stop-color="#ffc35c"/><stop offset="1" stop-color="#ff6a3d"/></radialGradient>
    <radialGradient id="halo"><stop offset="0" stop-color="#ffb347" stop-opacity=".35"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
    <radialGradient id="shade" cx="34%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${Array.from({ length: 90 }, (_, i) => `<circle cx="${(i * 263) % 1200}" cy="${(i * 151) % 630}" r="${(i % 3) * 0.7 + 0.7}" fill="#fff" opacity="${0.25 + (i % 5) * 0.12}"/>`).join('')}
  ${art}
  <g font-family="${font}" fill="#eceaff">
    <text x="72" y="118" font-size="26" font-weight="600" fill="#a3a1c6" letter-spacing="2">${esc(eyebrow)}</text>
    ${titleLines.map((l, i) => `<text x="72" y="${200 + i * 72}" font-size="64" font-weight="800">${esc(l)}</text>`).join('')}
    ${subLines.map((l, i) => `<text x="72" y="${210 + titleLines.length * 72 + i * 40}" font-size="30" fill="#c9c6ec">${esc(l)}</text>`).join('')}
    <text x="72" y="566" font-size="24" font-weight="600" fill="#8b7cf0">${esc(footer)}</text>
  </g>
</svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true, defaultFontFamily: lang === 'zh' ? 'PingFang SC' : 'Helvetica' } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
