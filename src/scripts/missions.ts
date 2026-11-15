// A local, deterministic walkthrough. No model calls, uploads or generated-file claims.
const root = document.querySelector<HTMLElement>('[data-mission-console]');
if (root) {
  const zh = root.dataset.lang === 'zh';
  const say = (en: string, cn: string) => zh ? cn : en;
  const panels = [...root.querySelectorAll<HTMLElement>('[data-mission-panel]')];
  let active = panels[0];
  let step = 0;
  let playing = false;
  let approved = false;
  let timer = 0;
  const count = () => active.querySelectorAll('[data-step-content]').length;
  const stop = () => { clearTimeout(timer); playing = false; };
  const writeUrl = () => {
    const url = new URL(location.href);
    url.searchParams.set('mission', active.dataset.missionPanel!);
    url.searchParams.set('step', String(step + 1));
    url.hash = '';
    history.replaceState(null, '', url);
  };
  function render() {
    panels.forEach(p => p.hidden = p !== active);
    root!.querySelectorAll<HTMLAnchorElement>('[data-select-mission]').forEach(link => link.setAttribute('aria-current', String(link.dataset.selectMission === active.dataset.missionPanel)));
    active.querySelectorAll<HTMLElement>('[data-step-content]').forEach((el,i) => el.hidden = i !== step);
    active.querySelectorAll<HTMLButtonElement>('[data-select-step]').forEach((button,i) => i === step ? button.setAttribute('aria-current', 'step') : button.removeAttribute('aria-current'));
    active.querySelector<HTMLButtonElement>('[data-action=previous]')!.disabled = step === 0;
    active.querySelector<HTMLButtonElement>('[data-action=next]')!.disabled = step === count() - 1;
    active.querySelector('[data-action=play]')!.textContent = playing ? say('Pause demo','暂停演示') : step === count()-1 ? say('Replay demo','重播演示') : say('Play demo','播放演示');
    const progress = active.querySelector<HTMLElement>('[role=progressbar]')!;
    progress.setAttribute('aria-valuenow', String(step+1));
    progress.querySelector<HTMLElement>('span')!.style.width = `${(step+1)/count()*100}%`;
    active.querySelector<HTMLElement>('[data-handoff]')!.hidden = step !== count()-1;
    const approve = active.querySelector<HTMLButtonElement>('[data-action=approve]')!;
    approve.disabled = approved;
    approve.textContent = approved ? say('Example approved ✓','示例已确认 ✓') : say('Approve example handoff','确认示例交付');
    active.querySelector('.playback-status')!.textContent = approved ? say('Example handoff reviewed · demo only','示例交付已审阅 · 仅演示') : playing ? say(`Playing demo · stop ${step+1} of ${count()}`,`演示播放中 · 第 ${step+1} / ${count()} 站`) : step === count()-1 ? say('Final stop · review the example','已抵达最后一站 · 请审阅示例') : say(`Preview · stop ${step+1} of ${count()}`,`预览中 · 第 ${step+1} / ${count()} 站`);
  }
  function tick() {
    timer = window.setTimeout(() => {
      step = Math.min(step+1,count()-1);
      if (step === count()-1) stop();
      render(); writeUrl();
      if (playing) tick();
    }, 2600);
  }
  function restore() {
    stop(); approved = false;
    const params = new URLSearchParams(location.search);
    active = panels.find(p=>p.dataset.missionPanel===params.get('mission')) || panels[0];
    const requested = Number(params.get('step') || 1);
    step = Number.isInteger(requested) ? Math.max(0,Math.min(count()-1,requested-1)) : 0;
    render();
  }
  root.querySelectorAll<HTMLElement>('[data-demo-control]').forEach(el=>el.hidden=false);
  root.dataset.enhanced = 'true';
  root.addEventListener('click', e => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-select-mission], [data-select-step], [data-action]');
    if (!target) return;
    if (target.dataset.selectMission) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); stop();
      active = panels.find(p=>p.dataset.missionPanel===target.dataset.selectMission)!;
      step = 0; approved = false;
    } else if (target.dataset.selectStep !== undefined) {
      stop(); step = Number(target.dataset.selectStep); approved = false;
    } else {
      const action = target.dataset.action;
      if (action === 'play') {
        if (playing) stop();
        else { if (step===count()-1) step=0; approved=false; playing=true; tick(); }
      } else if (action === 'approve') { stop(); approved=true; }
      else {
        stop(); approved=false;
        if (action==='next') step=Math.min(step+1,count()-1);
        if (action==='previous') step=Math.max(step-1,0);
        if (action==='reset') step=0;
      }
    }
    render(); writeUrl();
  });
  // Open a route from the shared star map without reloading the entire universe.
  document.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || root.contains(e.target as Node)) return;
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    const destination = panels.find(p=>p.dataset.missionPanel === url.searchParams.get('mission'));
    if (!destination) return;
    e.preventDefault(); stop(); active = destination; step = 0; approved = false;
    document.querySelector<HTMLButtonElement>('.scene-panel:not([hidden]) .p-close')?.click();
    render(); writeUrl();
    root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'});
  });
  window.addEventListener('popstate', restore);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); render(); } });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', () => { if (!playing) render(); });
  restore();
}
