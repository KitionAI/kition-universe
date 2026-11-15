// The agent replay panel. It plays back a kition-showcase sample: the kit
// commands in the order they were run, shown as the KHP calls an agent sends
// (<kit>_inspect, <kit>_run, <kit>_check), beside the pictures the kit rendered
// after each group of commands. Nothing here calls a model or a kit: it is a
// recording, and the panel says so.
//
// Any element with data-replay="<kit>/<scenario>" opens it; `?replay=` in the
// URL opens it on load. While it plays it sends `ku:replay-frame` (the planet
// page lights the buildings in use) and `ku:replay-end`.

interface Frame {
  img: string;
  w: number;
  h: number;
  say: { en: string; zh: string };
  lights: string[];
  steps: { c: string; a: string }[];
}
interface Replay {
  kit: string;
  scenario: string;
  sample: string;
  title: string;
  file: string;
  goal: { en: string; zh: string };
  commands: number;
  commit: string;
  frames: Frame[];
}
interface KitInfo {
  name: string;
  color: string;
  href: string;
}

const WATCHED = 'ku-replays';
export function watchedReplays(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(WATCHED) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function markWatched(id: string) {
  const v = watchedReplays();
  if (v.includes(id)) return;
  v.push(id);
  try {
    localStorage.setItem(WATCHED, JSON.stringify(v));
  } catch {
    /* progress just isn't remembered */
  }
  window.dispatchEvent(new CustomEvent('ku:progress'));
}

export function initReplay() {
  const root = document.getElementById('agent-replay');
  if (!root) return;
  const lang = (root.dataset.lang || 'en') as 'en' | 'zh';
  const base = root.dataset.base || '';
  const kits: Record<string, KitInfo> = JSON.parse(root.querySelector('#replay-kits')!.textContent || '{}');
  const mcp = root.querySelector('#replay-mcp')!.textContent || '';
  const S: Record<string, string> = JSON.parse(root.querySelector('#replay-strings')!.textContent || '{}');
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const log = $('.r-log'), img = $<HTMLImageElement>('.r-shot img'), cap = $('.r-cap'), dots = $('.r-dots');
  const playBtn = $<HTMLButtonElement>('[data-r=play]'), speedBtn = $<HTMLButtonElement>('[data-r=speed]');
  const bar = $('.r-bar i'), done = $('.r-done'), copyBtn = $<HTMLButtonElement>('[data-r=copy]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let data: Replay | null = null;
  let id = '';
  let frame = -1; // the frame whose commands are being shown
  let line = 0;
  let playing = false;
  let speed = 1;
  let timer = 0;
  let opener: HTMLElement | null = null;

  const asset = (file: string) => `${base}/assets/replay/${id}/${file}`;
  const el = (tag: string, cls: string, text = '') => {
    const e = document.createElement(tag);
    e.className = cls;
    e.textContent = text;
    return e;
  };
  const say = (cls: string, text: string) => {
    const row = log.appendChild(el('div', `l ${cls}`, text));
    log.scrollTop = log.scrollHeight;
    return row;
  };

  function showShot(index: number) {
    if (!data) return;
    const f = data.frames[Math.max(0, index)];
    img.src = asset(f.img);
    img.width = f.w;
    img.height = f.h;
    img.alt = `${data.title}: ${f.say[lang]}`;
    cap.textContent = index < 0 ? S.before : `${index + 1} / ${data.frames.length} · ${f.say[lang]}`;
    root!.querySelector('.r-shot')!.classList.toggle('blank', index < 0);
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i <= index));
    bar.style.width = `${((index + 1) / data.frames.length) * 100}%`;
  }

  /** Everything up to and including frame `to`, without animation. */
  function jump(to: number) {
    if (!data) return;
    clearTimeout(timer);
    log.textContent = '';
    opening();
    for (let i = 0; i <= to; i++) {
      runHead(i);
      for (const s of data.frames[i].steps) stepLine(s);
      runTail(i);
    }
    frame = to;
    line = to < 0 ? 0 : data.frames[to].steps.length;
    showShot(to);
    announce(to);
    if (to >= data.frames.length - 1) finish();
    else done.hidden = true;
  }

  const tool = (name: string) => `${data!.kit}_${name}`;
  function opening() {
    say('you', data!.goal[lang]);
    say('call', `→ ${tool('inspect')} { path: "${data!.file}", preview: true }`);
    say('back', `← ${S.inspectBack}`);
  }
  function runHead(i: number) {
    say('note', `${S.step} ${i + 1}: ${data!.frames[i].say[lang]}`);
    say('call', `→ ${tool('run')} { path: "${data!.file}", preview: true, steps: [`);
  }
  function stepLine(s: { c: string; a: string }) {
    const row = say('cmd', '');
    row.append(el('b', '', s.c));
    if (s.a) row.append(el('span', '', ` ${s.a}`));
  }
  function runTail(i: number) {
    say('call', '  ] }');
    say('back', `← ${S.runBack.replace('{n}', String(data!.frames[i].steps.length))}`);
  }
  function announce(i: number) {
    if (!data) return;
    window.dispatchEvent(new CustomEvent('ku:replay-frame', { detail: { id, kit: data.kit, scenario: data.scenario, lights: i < 0 ? [] : data.frames[i].lights, index: i, total: data.frames.length } }));
  }
  function finish() {
    if (!data) return;
    playing = false;
    playBtn.dataset.state = 'again';
    playBtn.textContent = S.again;
    if (!log.querySelector('.l.end')) {
      say('call', `→ ${tool('check')} { path: "${data.file}" }`);
      say('back end', `← ${S.checkBack}`);
    }
    done.hidden = false;
    markWatched(id);
  }

  function tick() {
    if (!data || !playing) return;
    const last = data.frames.length - 1;
    if (frame < 0 || line >= data.frames[frame].steps.length) {
      if (frame >= 0) {
        // this group has been sent: the kit answers with the picture
        runTail(frame);
        showShot(frame);
        if (frame === last) return finish();
      }
      frame += 1;
      line = 0;
      runHead(frame);
      announce(frame);
      timer = window.setTimeout(tick, 420 / speed);
      return;
    }
    const steps = data.frames[frame].steps;
    stepLine(steps[line]);
    line += 1;
    // a long group scrolls by quickly, a short one can be read; a group takes about 2 seconds
    const gap = Math.min(380, Math.max(28, 2000 / steps.length));
    timer = window.setTimeout(tick, (line >= steps.length ? 520 : gap) / speed);
  }

  function play() {
    if (!data) return;
    if (frame >= data.frames.length - 1 && line >= data.frames[frame].steps.length) restart();
    playing = true;
    playBtn.dataset.state = 'pause';
    playBtn.textContent = S.pause;
    done.hidden = true;
    clearTimeout(timer);
    timer = window.setTimeout(tick, 250);
  }
  function pause() {
    playing = false;
    clearTimeout(timer);
    playBtn.dataset.state = 'play';
    playBtn.textContent = S.play;
  }
  function restart() {
    clearTimeout(timer);
    frame = -1;
    line = 0;
    log.textContent = '';
    opening();
    showShot(-1);
    announce(-1);
    done.hidden = true;
  }

  async function open(next: string, from?: HTMLElement | null) {
    opener = from ?? (document.activeElement as HTMLElement | null);
    pause();
    id = next;
    root!.hidden = false;
    root!.classList.add('loading');
    document.documentElement.classList.add('replaying');
    try {
      const res = await fetch(asset('replay.json'));
      if (!res.ok) throw new Error(String(res.status));
      data = (await res.json()) as Replay;
    } catch {
      data = null;
      log.textContent = S.failed;
      root!.classList.remove('loading');
      return;
    }
    root!.classList.remove('loading');
    const kit = kits[data.kit];
    root!.style.setProperty('--kit', kit?.color || '#8b7cf0');
    $('.r-kit').textContent = kit?.name || data.kit;
    $('.r-title').textContent = data.title;
    $('.r-source').textContent = S.source.replace('{sample}', data.sample).replace('{n}', String(data.commands)).replace('{commit}', data.commit || '?');
    $<HTMLAnchorElement>('[data-r=kitpage]').href = `${kit?.href || '#'}#scenario-${data.scenario}`;
    dots.textContent = '';
    data.frames.forEach((f, i) => {
      const b = el('button', '', '') as HTMLButtonElement;
      b.type = 'button';
      b.title = f.say[lang];
      b.setAttribute('aria-label', `${S.step} ${i + 1}: ${f.say[lang]}`);
      b.addEventListener('click', () => {
        pause();
        jump(i);
      });
      dots.append(b);
    });
    // warm the pictures so the playback does not wait on the network
    for (const f of data.frames) new Image().src = asset(f.img);
    restart();
    $('.r-title').focus({ preventScroll: true });
    if (reduced) jump(data.frames.length - 1);
    else play();
  }
  function close() {
    if (root!.hidden) return;
    pause();
    root!.hidden = true;
    document.documentElement.classList.remove('replaying');
    window.dispatchEvent(new CustomEvent('ku:replay-end', { detail: { id } }));
    opener?.focus?.({ preventScroll: true });
  }

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-r]');
    if (!b || !data) return;
    const what = b.dataset.r;
    if (what === 'close') close();
    else if (what === 'play') (playing ? pause : play)();
    else if (what === 'prev') { pause(); jump(Math.max(-1, frame - 1)); }
    else if (what === 'next') { pause(); jump(Math.min(data.frames.length - 1, frame + 1)); }
    else if (what === 'speed') {
      speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
      speedBtn.textContent = `${speed}×`;
    } else if (what === 'copy') {
      const names = [...new Set(data.frames.flatMap((f) => f.steps.map((s) => s.c)))];
      const text = S.prompt
        .replace('{goal}', data.goal[lang])
        .replace(/\{kit\}/g, data.kit)
        .replace('{file}', data.file)
        .replace('{commands}', names.slice(0, 24).join(', ') + (names.length > 24 ? ', …' : ''))
        .replace('{mcp}', mcp);
      navigator.clipboard?.writeText(text).then(
        () => {
          copyBtn.textContent = S.copied;
          setTimeout(() => (copyBtn.textContent = S.copy), 1800);
        },
        () => (copyBtn.textContent = S.copyFailed),
      );
    }
  });
  if (root.dataset.close) root.querySelector('[data-r=close]')?.setAttribute('aria-label', root.dataset.close);
  document.addEventListener('keydown', (e) => {
    if (root!.hidden) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }, true);
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-replay]');
    if (!b || !b.dataset.replay) return;
    e.preventDefault();
    open(b.dataset.replay, b);
  });
  window.addEventListener('ku:replay', (e) => {
    const d = (e as CustomEvent).detail || {};
    if (d.id) open(d.id, d.from);
  });
  window.addEventListener('ku:replay-close', close);
  const wanted = new URLSearchParams(location.search).get('replay');
  if (wanted && /^[a-z]+\/[a-z0-9-]+$/.test(wanted)) open(wanted, null);
}
