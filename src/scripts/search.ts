// Search (⌘K, "/" and the task bar): one box for scenarios, kits, capabilities,
// agent commands, file formats and products. Matching is plain keyword
// matching in the browser; nothing is sent anywhere and no model is involved.
interface Item {
  t: string;
  n: string;
  d: string;
  k: string;
  href: string;
  color?: string;
  go?: { galaxy?: string; planet?: string };
  replay?: string;
}

const CJK = /[㐀-鿿]/;
/** Words of a query; a run of Chinese also counts as its two-character pieces. */
function tokens(q: string): string[] {
  const out: string[] = [];
  for (const word of q.toLowerCase().split(/[\s,，、。.;；]+/).filter(Boolean)) {
    if (CJK.test(word) && word.length > 2) for (let i = 0; i < word.length - 1; i++) out.push(word.slice(i, i + 2));
    else out.push(word);
  }
  return out;
}
const WEIGHT: Record<string, number> = { scenario: 5, kit: 5, make: 3, format: 4, can: 2, command: 2, product: 2, page: 2 };

export function rank(items: Item[], q: string): Item[] {
  const ts = tokens(q);
  if (!ts.length) return [];
  const full = q.trim().toLowerCase();
  const scored: { item: Item; score: number }[] = [];
  for (const item of items) {
    const name = item.n.toLowerCase();
    const hay = `${name} ${item.d.toLowerCase()} ${item.k}`;
    let hits = 0, score = 0;
    for (const tk of ts) {
      if (name === tk) { hits++; score += 12; }
      else if (name.startsWith(tk)) { hits++; score += 7; }
      else if (name.includes(tk)) { hits++; score += 5; }
      else if (hay.includes(tk)) { hits++; score += 2; }
    }
    // every word must be found, except in a Chinese phrase, where most of its pieces are enough
    const need = CJK.test(full) ? Math.ceil(ts.length * 0.6) : ts.length;
    if (hits < need) continue;
    if (name === full) score += 20;
    scored.push({ item, score: score + (WEIGHT[item.t] ?? 1) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 24).map((s) => s.item);
}

export function initSearch() {
  const root = document.getElementById('ku-search') as HTMLDialogElement | null;
  if (!root) return;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const list = root.querySelector<HTMLElement>('.s-list')!;
  const empty = root.querySelector<HTMLElement>('.s-empty')!;
  const labels: Record<string, string> = JSON.parse(root.dataset.labels || '{}');
  let items: Item[] | null = null;
  let shown: Item[] = [];
  let active = 0;

  async function load() {
    if (items) return items;
    try {
      items = (await (await fetch(root!.dataset.src!)).json()) as Item[];
    } catch {
      items = [];
    }
    return items;
  }
  function render() {
    list.textContent = '';
    empty.hidden = shown.length > 0 || !input.value.trim();
    shown.forEach((item, i) => {
      const a = document.createElement('a');
      a.href = item.href;
      a.className = 's-item';
      a.id = `s-item-${i}`;
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', String(i === active));
      if (item.color) a.style.setProperty('--signal', item.color);
      const kind = document.createElement('span');
      kind.className = 's-kind';
      kind.textContent = labels[item.t] || item.t;
      const main = document.createElement('span');
      main.className = 's-main';
      const name = document.createElement('b');
      name.textContent = item.n;
      const desc = document.createElement('small');
      desc.textContent = item.d;
      main.append(name, desc);
      a.append(kind, main);
      if (item.replay) {
        const play = document.createElement('span');
        play.className = 's-play';
        play.textContent = `▶ ${labels.replay}`;
        a.append(play);
      }
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        choose(item);
      });
      a.addEventListener('pointermove', () => i !== active && setActive(i));
      list.append(a);
    });
    input.setAttribute('aria-activedescendant', shown.length ? `s-item-${active}` : '');
  }
  function setActive(i: number) {
    active = (i + shown.length) % Math.max(1, shown.length);
    [...list.children].forEach((el, k) => el.setAttribute('aria-selected', String(k === active)));
    list.children[active]?.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', `s-item-${active}`);
  }
  async function update() {
    const all = await load();
    const q = input.value.trim();
    // nothing typed: the things people come here to do
    shown = q ? rank(all, q) : all.filter((i) => i.t === 'scenario');
    active = 0;
    render();
  }
  function choose(item: Item) {
    root!.close();
    if (item.replay) {
      window.dispatchEvent(new CustomEvent('ku:replay', { detail: { id: item.replay } }));
      return;
    }
    // on a live star map, fly there; anywhere else, follow the link
    const goto = (window as unknown as { kuGoto?: (d: object) => boolean }).kuGoto;
    if (item.go && goto && goto(item.go)) {
      document.getElementById('universe-stage')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
    location.assign(item.href);
  }
  function open(seed = '') {
    if (root!.open) return;
    root!.showModal();
    input.value = seed;
    input.focus();
    update();
  }

  input.addEventListener('input', update);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter' && shown[active]) { e.preventDefault(); choose(shown[active]); }
    // a search field swallows the first Escape to clear itself; here Escape always closes
    else if (e.key === 'Escape') { e.preventDefault(); root.close(); }
  });
  root.addEventListener('click', (e) => e.target === root && root.close());
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-search-open]');
    if (b) open(b.dataset.searchOpen || '');
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      open();
    }
  });
}
