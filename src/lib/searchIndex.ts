// The search index (⌘K and the task bar): scenario galaxies, kits, what each kit
// can do, agent commands, file formats, things you can make and products, all
// from the data files. Built once per language; both languages' words are in
// the keywords, so a Chinese query works on the English site and the reverse.
import { href, planetHref, t, universe, type Lang } from './universe.ts';
import { scenarioAsks, scenarioGalaxies, scenarioHref } from './scenarioGalaxies.ts';
import { listedProducts, productHref, tagline } from './products.ts';
import { replayFor, replayId } from './replays.ts';

export interface SearchItem {
  /** scenario | kit | can | command | format | make | product | page */
  t: string;
  n: string; // what is shown
  d: string; // one line under it
  k: string; // extra words to match, lower case
  href: string;
  color?: string;
  /** on the star map: fly there instead of leaving the page */
  go?: { galaxy?: string; planet?: string };
  replay?: string;
}

export function searchIndex(lang: Lang): SearchItem[] {
  const u = universe();
  const both = (l: { en: string; zh: string } | undefined) => (l ? `${l.en} ${l.zh}` : '');
  const items: SearchItem[] = [];
  for (const g of scenarioGalaxies) {
    items.push({
      t: 'scenario', n: scenarioAsks[g.id][lang], d: `${g.name[lang]} · ${g.kits.map((k) => k.kit).join(' → ')}`,
      k: [both(scenarioAsks[g.id]), both(g.name), both(g.summary), both(g.outcome), g.kits.map((k) => k.kit).join(' ')].join(' ').toLowerCase(),
      href: scenarioHref(lang, g.id), color: g.color, go: { galaxy: g.id },
    });
  }
  for (const p of u.planets) {
    const formats = [...p.formats.native, ...p.formats.opens];
    items.push({
      t: 'kit', n: p.name, d: t(p.tagline, lang), k: [both(p.planet), both(p.tagline), both(p.summary), formats.join(' '), p.kitId].join(' ').toLowerCase(),
      href: planetHref(lang, p.id), color: p.color.dark, go: { planet: p.id },
    });
    for (const c of p.capabilities) {
      items.push({ t: 'can', n: t(c.title, lang), d: `${p.name} · ${t(c.body, lang)}`, k: [both(c.title), both(c.body), both(c.building), p.name].join(' ').toLowerCase(), href: `${planetHref(lang, p.id)}#cap-${c.id}`, color: p.color.dark });
    }
    for (const c of p.commands) {
      items.push({ t: 'command', n: c.name, d: `${p.name} · ${t(c.what, lang)}`, k: [both(c.what), p.name].join(' ').toLowerCase(), href: `${planetHref(lang, p.id)}#use-with-ai`, color: p.color.dark });
    }
    for (const sc of p.scenarios) {
      const r = replayFor(p.id, sc.id);
      items.push({
        t: 'make', n: t(sc.title, lang), d: `${p.name} · ${t(sc.body, lang)}`, k: [both(sc.title), both(sc.body), p.name].join(' ').toLowerCase(),
        href: `${planetHref(lang, p.id)}#scenario-${sc.id}`, color: p.color.dark, replay: r ? replayId(p.id, sc.id) : undefined,
      });
    }
    for (const ext of formats) {
      const native = p.formats.native.includes(ext);
      items.push({
        t: 'format', n: ext, d: lang === 'zh' ? `${p.name} ${native ? '的原生格式' : '可以打开'}` : `${native ? 'Native format of' : 'Opens in'} ${p.name}`,
        k: `${ext.replace('.', '')} ${p.name} file format 文件 格式 打开 open`, href: `${planetHref(lang, p.id)}#formats`, color: p.color.dark, go: { planet: p.id },
      });
    }
  }
  for (const p of listedProducts()) {
    items.push({ t: 'product', n: p.name, d: tagline(p, lang), k: `${p.kits.join(' ')} ${p.delivery.join(' ')} built with product 产品`.toLowerCase(), href: productHref(lang, p.id) });
  }
  const page = (n: string, d: string, k: string, path: string) => items.push({ t: 'page', n, d, k: k.toLowerCase(), href: href(lang, path) });
  page(u.star.name, t(u.star.tagline, lang), `khp protocol 协议 mcp agent inspect run check query batch ${both(u.star.body)}`, '/protocol/');
  page(lang === 'zh' ? '接入你的 AI（MCP 配置）' : 'Connect your AI (MCP setup)', t(u.mcp.intro, lang), 'mcp claude cursor agent server 配置 接入 kition-kits-mcp', '/protocol/#mcp');
  page(lang === 'zh' ? '星表：全部 Kit' : 'Star catalog: every kit', lang === 'zh' ? '把整个宇宙列成一张表' : 'The whole universe as a list', 'catalog list all kits 星表 列表', '/catalog/');
  page('Built with Kition', lang === 'zh' ? '用 Kition SDK 搭建的产品' : 'Products built on the Kition SDK', 'sdk embed script headless products 产品 产品星球 product planet 定居点 settlement', '/built-with/');
  return items;
}
