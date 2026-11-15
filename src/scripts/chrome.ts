// Theme toggle and exploration progress. Everything in localStorage is
// a per-visitor convenience; reads and writes are wrapped because storage can
// be missing (private windows, blocked site data).

import { KIT_IDS, KIT_COUNT } from '../lib/kits';

const VISITED = 'ku-visited';
const THEME = 'ku-theme';
export const TOTAL_PLANETS = KIT_COUNT;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: progress just isn't remembered */
  }
}

export function visited(): string[] {
  try {
    const v = JSON.parse(read(VISITED) || '[]');
    return Array.isArray(v) ? [...new Set(v.filter((x) => KIT_IDS.includes(x)))] : [];
  } catch {
    return [];
  }
}

export function markVisited(id: string) {
  const v = visited();
  if (!v.includes(id)) {
    v.push(id);
    write(VISITED, JSON.stringify(v));
  }
  renderProgress();
  window.dispatchEvent(new CustomEvent('ku:visited', { detail: v }));
}

const list = (key: string): string[] => {
  try {
    const v = JSON.parse(read(key) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
/** Scenario galaxies the visitor has flown to. */
export const visitedGalaxies = () => list('ku-galaxies');
export function markGalaxy(id: string) {
  const v = visitedGalaxies();
  if (v.includes(id)) return;
  v.push(id);
  write('ku-galaxies', JSON.stringify(v));
  renderProgress();
}

export function resolvedTheme(): 'light' | 'dark' {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return 'dark';
}

function applyResolved() {
  const r = resolvedTheme();
  document.documentElement.dataset.themeResolved = r;
  const btn = document.getElementById('ku-theme');
  if (btn) btn.title = r === 'dark' ? btn.dataset.dark || '' : btn.dataset.light || '';
  window.dispatchEvent(new CustomEvent('ku:theme', { detail: r }));
}

function renderProgress() {
  const el = document.getElementById('ku-progress');
  if (!el) return;
  const n = visited().length;
  // beside the planets: replays watched (▶) and scenario galaxies visited (✦)
  const replays = list('ku-replays').length, galaxies = visitedGalaxies().length;
  const more = document.getElementById('ku-progress-more');
  let label = (el.dataset.label || '').replace('{n}', String(n));
  if (more) {
    more.hidden = !replays && !galaxies;
    more.textContent = [replays ? `▶${replays}` : '', galaxies ? `✦${galaxies}` : ''].filter(Boolean).join(' ');
    if (replays) label += ` · ${(more.dataset.replays || '').replace('{n}', String(replays))}`;
    if (galaxies) label += ` · ${(more.dataset.galaxies || '').replace('{n}', String(galaxies))}`;
  }
  el.setAttribute('aria-label', label);
  el.title = label;
  const num = document.getElementById('ku-progress-n');
  if (num) num.textContent = String(n);
  const arc = document.getElementById('ku-progress-arc');
  const c = 2 * Math.PI * 7;
  if (arc) arc.setAttribute('stroke-dasharray', `${(n / TOTAL_PLANETS) * c} ${c}`);
}

export function initChrome() {
  applyResolved();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyResolved);
  document.getElementById('ku-theme')?.addEventListener('click', () => {
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    write(THEME, next);
    applyResolved();
  });
  renderProgress();
  window.addEventListener('storage', (e) => (e.key === VISITED || e.key === 'ku-replays' || e.key === 'ku-galaxies') && renderProgress());
  window.addEventListener('ku:progress', renderProgress);
}
