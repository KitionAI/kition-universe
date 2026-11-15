// The 60-second tour of the star map: four stops that answer "what is this",
// "what does a kit do", "how do kits combine" and "what can I build". It only
// drives what is already there (the camera, a replay); the visitor starts it
// and can leave at any stop.
interface Stop {
  go: { galaxy?: string; planet?: string };
  title: string;
  text: string;
  replay?: string;
}

export function initTour(root: HTMLElement) {
  const btn = root.querySelector<HTMLButtonElement>('[data-tour]');
  const card = root.querySelector<HTMLElement>('.tour-card');
  const goto = (window as unknown as { kuGoto?: (d: object) => boolean }).kuGoto;
  if (!btn || !card || !goto) return;
  const stops: Stop[] = JSON.parse(card.dataset.stops || '[]');
  const title = card.querySelector<HTMLElement>('.t-title')!, text = card.querySelector<HTMLElement>('.t-text')!;
  const count = card.querySelector<HTMLElement>('.t-count')!, bar = card.querySelector<HTMLElement>('.t-bar i')!;
  const next = card.querySelector<HTMLButtonElement>('[data-t=next]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STAY = 13000;
  let at = -1;
  let timer = 0, replayTimer = 0;

  function show(i: number) {
    clearTimeout(timer);
    clearTimeout(replayTimer);
    window.dispatchEvent(new CustomEvent('ku:replay-close'));
    if (i >= stops.length) return end();
    at = i;
    const stop = stops[i];
    goto!(stop.go);
    title.textContent = stop.title;
    text.textContent = stop.text;
    count.textContent = `${i + 1} / ${stops.length}`;
    next.textContent = i === stops.length - 1 ? next.dataset.done! : next.dataset.next!;
    // the bar runs down the time left at this stop
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth;
    if (!reduced) {
      bar.style.transition = `width ${STAY}ms linear`;
      bar.style.width = '100%';
      timer = window.setTimeout(() => show(at + 1), STAY);
    }
    // at a kit, let the visitor watch an agent use it for a few seconds
    if (stop.replay && !reduced) replayTimer = window.setTimeout(() => window.dispatchEvent(new CustomEvent('ku:replay', { detail: { id: stop.replay } })), 2600);
  }
  function end() {
    clearTimeout(timer);
    clearTimeout(replayTimer);
    window.dispatchEvent(new CustomEvent('ku:replay-close'));
    at = -1;
    card!.hidden = true;
    root.classList.remove('touring');
    goto!({ galaxy: 'overview' });
    btn!.focus({ preventScroll: true });
  }
  btn.hidden = false;
  btn.addEventListener('click', () => {
    card.hidden = false;
    root.classList.add('touring');
    root.scrollIntoView({ block: 'start', behavior: 'smooth' });
    show(0);
    title.focus({ preventScroll: true });
  });
  card.addEventListener('click', (e) => {
    const what = (e.target as HTMLElement).closest<HTMLElement>('[data-t]')?.dataset.t;
    if (what === 'next') show(at + 1);
    else if (what === 'back') show(Math.max(0, at - 1));
    else if (what === 'exit') end();
  });
  root.addEventListener('keydown', (e) => e.key === 'Escape' && at >= 0 && end());
}
