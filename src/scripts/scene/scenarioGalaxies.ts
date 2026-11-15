// Scenario galaxies: a piece of work passing through several kits. Each galaxy
// has the kits' own planets (same surface and landmark as in the KHP galaxy), a
// route in step order, a courier that carries the file from kit to kit, and a
// result deck where the finished files end up. Four layouts (lane, ring,
// binary, hub) come from the data, so no two neighbours look alike.
// From afar a galaxy is dust and a glow; the rest is built on first approach.
import * as THREE from 'three';
import { atmosphere, ease, galaxyDust, glowTexture, shade, type Theme } from './common';
import { signature, type Signature } from './signature';
import { planetBody, type PlanetBody } from './planetSurface';
import { layoutScenario } from '../../lib/scenarioLayout';
import type { ScenePlanet, SceneScenarioGalaxy } from './types';

export type ScenarioKind = 'scenario' | 'scenekit';
interface Context {
  scene: THREE.Scene;
  data: SceneScenarioGalaxy[];
  planets: ScenePlanet[];
  theme: Theme;
  small: boolean;
  mkLabel: (kind: ScenarioKind, id: string, html: string, aria: string, style?: string) => HTMLButtonElement;
  addTarget: (target: { kind: ScenarioKind; id: string; object: THREE.Object3D; hit: THREE.Object3D[]; label: HTMLButtonElement; radius: number; labelOffset: number }) => void;
}

const WORLD_R = 3.3;
const CARD_W = 5.6, CARD_H = CARD_W * (256 / 384);
// cards are tinted just under the bloom threshold, so a white page stays a page instead of a glare
const CARD_TINT = '#b9bbc6';
const FAR_LAYER = 1; // hit spheres on this layer are ignored by the raycaster
const back = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); // ease out, a little past 1
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** A file card: kit colour bar, kit name, what it is, and the kit's own render when there is one. */
function cardTexture(kit: ScenePlanet, title: string, ext: string, thumb?: string): THREE.CanvasTexture {
  const W = 384, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const frame = (img?: HTMLImageElement) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#10121f';
    g.beginPath();
    g.roundRect(4, 4, W - 8, H - 8, 18);
    g.fill();
    g.save();
    g.clip();
    if (img) {
      // cover the area under the bar
      const top = 46, h = H - top - 4, w = W - 8;
      const k = Math.max(w / img.width, h / img.height);
      g.fillStyle = '#ffffff';
      g.fillRect(4, top, w, h);
      g.drawImage(img, 4 + (w - img.width * k) / 2, top, img.width * k, img.height * k);
    } else {
      // no render yet: a plain sheet with ruled lines in the kit colour
      g.fillStyle = shade(kit.color.dark, -0.55);
      g.fillRect(4, 46, W - 8, H - 50);
      g.fillStyle = kit.color.dark;
      g.globalAlpha = 0.35;
      for (let i = 0; i < 5; i++) g.fillRect(34, 78 + i * 30, (W - 68) * (i % 3 === 2 ? 0.55 : 0.92), 10);
      g.globalAlpha = 1;
      g.fillStyle = '#ffffff';
      g.font = '600 24px "Space Grotesk Variable", system-ui, sans-serif';
      g.fillText(title.length > 24 ? `${title.slice(0, 23)}…` : title, 30, H - 30);
    }
    g.fillStyle = kit.color.dark;
    g.fillRect(4, 4, W - 8, 42);
    g.restore();
    g.fillStyle = '#0b0c16';
    g.font = '700 24px "Space Grotesk Variable", system-ui, sans-serif';
    g.fillText(kit.name, 22, 34);
    g.font = '600 19px ui-monospace, monospace';
    g.textAlign = 'right';
    g.fillText(ext, W - 22, 33);
    g.textAlign = 'left';
    g.lineWidth = 3;
    g.strokeStyle = kit.color.dark;
    g.beginPath();
    g.roundRect(4, 4, W - 8, H - 8, 18);
    g.stroke();
    tex.needsUpdate = true;
  };
  frame();
  if (thumb) {
    const img = new Image();
    img.onload = () => frame(img);
    img.src = thumb;
  }
  return tex;
}

export function scenarioGalaxies(ctx: Context) {
  let theme = ctx.theme;
  const glowMap = glowTexture();
  const kit = (id: string) => ctx.planets.find((p) => p.id === id)!;
  const hull = new THREE.MeshStandardMaterial({ color: '#d2d5e3', roughness: 0.4, metalness: 0.6 });
  const wall = new THREE.MeshStandardMaterial({ color: '#cfd3e6', roughness: 0.6, metalness: 0.1 });
  const glass = new THREE.MeshStandardMaterial({ color: '#9fb4ff', roughness: 0.1, metalness: 0.7, emissive: '#ffe2b0', emissiveIntensity: theme === 'dark' ? 0.9 : 0.2 });
  const hues = (p: ScenePlanet) => ({ main: p.color.dark, light: shade(p.color.dark, 0.25), dark: shade(p.color.dark, -0.3) });
  const blend = () => (theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending);

  const systems = ctx.data.map((g, index) => {
    const center = new THREE.Vector3(...g.position);
    const root = new THREE.Group();
    root.position.copy(center);
    ctx.scene.add(root);
    const lay = layoutScenario(g.form, g.kits.length, g.hub);
    const deckAt = new THREE.Vector3(...lay.deck);
    const kitColors = g.kits.map((k) => kit(k.id).color.dark);
    const four = (i: number) => kitColors[i % kitColors.length];

    // ── what you see from afar: dust in the kits' colours, shaped by the layout ──
    const dustGroup = new THREE.Group();
    root.add(dustGroup);
    const count = ctx.small ? 800 : 1700;
    const dusts: THREE.Points[] = [];
    const addDust = (n: number, inner: number, outer: number, seed: number, at?: THREE.Vector3) => {
      const d = galaxyDust(n, inner, outer, seed, [four(0), '#e3e5ff', four(1), four(2)]);
      if (at) d.position.copy(at);
      dustGroup.add(d);
      dusts.push(d);
      return d;
    };
    if (g.form === 'lane') {
      // a long, tilted bar
      addDust(count, 3, 44, index + 101);
      dustGroup.scale.set(1.18, 1, 0.52);
      dustGroup.rotation.y = 0.12;
    } else if (g.form === 'ring') {
      // a ring galaxy: a bright loop with a clear middle
      addDust(Math.round(count * 0.8), 19, 31, index + 101);
      addDust(Math.round(count * 0.3), 2, 9, index + 151);
    } else if (g.form === 'binary') {
      // two small spirals side by side
      addDust(Math.round(count * 0.55), 2, 21, index + 101, new THREE.Vector3(...lay.foci[0]));
      addDust(Math.round(count * 0.55), 2, 21, index + 151, new THREE.Vector3(...lay.foci[1])).rotation.y = Math.PI;
    } else {
      // a dense core with a thin halo
      addDust(Math.round(count * 0.7), 2, 20, index + 101);
      addDust(Math.round(count * 0.4), 26, 40, index + 151);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: g.color, transparent: true, depthWrite: false, opacity: 0.4, blending: blend() }));
    glow.scale.setScalar(26);
    glow.position.copy(deckAt).setY(0);
    root.add(glow);
    const fociGlow = lay.foci.map((f, i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: four(i ? g.kits.length - 1 : 0), transparent: true, depthWrite: false, opacity: 0.3, blending: blend() }));
      sp.scale.setScalar(15);
      sp.position.set(...f);
      root.add(sp);
      return sp;
    });

    // ── the result deck: always there, it is what the galaxy is for ──
    const deck = new THREE.Group();
    deck.position.copy(deckAt);
    root.add(deck);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5, 0.6, 6), hull);
    pad.position.y = -0.9;
    deck.add(pad);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.75, 0.09, 6, 6), new THREE.MeshBasicMaterial({ color: g.color }));
    rim.rotation.x = Math.PI / 2;
    rim.rotation.z = Math.PI / 6;
    rim.position.y = -0.55;
    deck.add(rim);
    // a wide, unseen sphere so the whole galaxy can be clicked from the overview
    const farHit = new THREE.Mesh(new THREE.SphereGeometry(42, 16, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    farHit.scale.y = 0.22; // the whole disc of dust, flat like the galaxy
    root.add(farHit);
    const coreLabel = ctx.mkLabel('scenario', g.id, `<span class="n">${g.name}</span><span class="k">${g.outcome}</span>`, `${g.name}: ${g.outcome}`, `--signal:${g.color}`);
    ctx.addTarget({ kind: 'scenario', id: g.id, object: deck, hit: [pad, farHit], label: coreLabel, radius: 4.6, labelOffset: 1.25 });

    // ── kit worlds: empty groups now (labels need them), filled on first approach ──
    const detail = new THREE.Group();
    detail.visible = false;
    root.add(detail);
    const worlds = g.kits.map((entry, j) => {
      const p = kit(entry.id);
      const world = new THREE.Group();
      world.position.set(...lay.worlds[j]);
      detail.add(world);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(WORLD_R * lay.scale[j] * 1.25, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
      world.add(hit);
      const id = `${g.id}:${p.id}`;
      const step = String(j + 1).padStart(2, '0');
      const label = ctx.mkLabel('scenekit', id,
        `<span class="step">${step}</span><span class="n">${p.name}</span><span class="k">${entry.title}${p.status === 'preview' ? ' · Preview' : ''}</span>${entry.replay ? '<span class="play" aria-hidden="true">▶</span>' : ''}`,
        `${step} ${p.name} · ${entry.title}`, `--signal:${p.color.dark}`);
      ctx.addTarget({ kind: 'scenekit', id, object: world, hit: [hit], label, radius: WORLD_R * lay.scale[j], labelOffset: 1.5 });
      return { p, entry, world, label, base: lay.scale[j], sig: null as Signature | null, body: null as PlanetBody | null, globe: null as THREE.Mesh | null, air: null as THREE.Mesh | null, pulse: 0 };
    });

    // the route: every kit in step order, then the deck
    const stops = [...worlds.map((w) => w.world.position.clone().add(new THREE.Vector3(0, WORLD_R * w.base + 3.4, 0))), deckAt.clone().add(new THREE.Vector3(0, 1.2, 3.2))];
    const route = new THREE.CatmullRomCurve3(stops, false, 'catmullrom', 0.5);
    const ROUTE_PTS = 160;

    const state = {
      built: false, reveal: 0, near: false,
      seg: 0, t: 0, wait: 1.2, delivered: 0,
      routeLine: null as THREE.Line | null,
      courier: null as THREE.Group | null,
      cargo: null as THREE.Sprite | null,
      engine: null as THREE.Sprite | null,
      cards: [] as { sp: THREE.Sprite; home: THREE.Vector3; lit: number }[],
      textures: [] as THREE.Texture[],
    };

    function build() {
      state.built = true;
      worlds.forEach((w, j) => {
        const R = WORLD_R * w.base;
        // the same world as in the KHP galaxy: same look, clouds and ring (no moons: the route needs the room)
        const body = planetBody(w.p, ctx.planets.indexOf(w.p) + 1, theme, R, { moons: false, size: false });
        w.world.add(body.group);
        w.body = body;
        w.globe = body.surface;
        w.air = atmosphere(R * 1.12, w.p.color.dark, theme === 'dark' ? 0.8 : 0.4);
        w.world.add(w.air);
        // the landmark that stands on this planet's pole in its own city
        const sig = signature(w.p.id, hues(w.p), { wall, glass }, theme, index * 16 + j + 3);
        const k = (R * 1.25) / Math.max(sig.height, sig.radius * 1.6, 0.001);
        sig.group.scale.setScalar(k);
        sig.group.position.y = R * 0.98;
        w.world.add(sig.group);
        w.sig = sig;
        // a ring on the ground plane marks the step
        const ring = new THREE.Mesh(new THREE.RingGeometry(R * 1.55, R * 1.62, 64), new THREE.MeshBasicMaterial({ color: w.p.color.dark, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -R * 0.2;
        w.world.add(ring);
      });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(ROUTE_PTS)), new THREE.LineDashedMaterial({ color: g.color, dashSize: 0.9, gapSize: 0.7, transparent: true, opacity: 0.75, depthWrite: false }));
      line.computeLineDistances();
      line.frustumCulled = false;
      detail.add(line);
      state.routeLine = line;

      // the courier: an agent carrying the file from kit to kit
      const courier = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 10), new THREE.MeshStandardMaterial({ color: '#f4f2ff', roughness: 0.35, metalness: 0.4, emissive: g.color, emissiveIntensity: 0.25 }));
      body.rotation.x = Math.PI / 2;
      courier.add(body);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.55), body.material);
      wing.position.z = -0.3;
      courier.add(wing);
      const engine = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: g.color, transparent: true, depthWrite: false, blending: blend() }));
      engine.position.z = -0.95;
      engine.scale.setScalar(1.0);
      engine.material.opacity = 0.7;
      courier.add(engine);
      courier.position.copy(stops[0]);
      detail.add(courier);
      state.courier = courier;
      state.engine = engine;

      // one card per step; the same picture rides on the courier and lands on the deck
      const n = worlds.length;
      worlds.forEach((w, j) => {
        const tex = cardTexture(w.p, w.entry.title, w.entry.ext, w.entry.replay?.thumb);
        state.textures.push(tex);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: CARD_TINT, transparent: true, depthWrite: false, opacity: 0 }));
        sp.scale.set(CARD_W, CARD_H, 1);
        // a fan above the deck: two rows when there are four
        const cols = n > 3 ? 2 : n;
        const col = (j % cols) - (cols - 1) / 2, rowY = Math.floor(j / cols);
        const home = deckAt.clone().add(new THREE.Vector3(col * (CARD_W + 0.5), 2.6 + (Math.ceil(n / cols) - 1 - rowY) * (CARD_H + 0.4), 0));
        sp.position.copy(home);
        detail.add(sp);
        state.cards.push({ sp, home, lit: 0 });
      });
      const cargo = new THREE.Sprite(new THREE.SpriteMaterial({ map: state.textures[0], color: CARD_TINT, transparent: true, depthWrite: false }));
      cargo.scale.set(3.3, 2.2, 1);
      detail.add(cargo);
      state.cargo = cargo;
      applyTheme();
    }

    function applyTheme() {
      const dark = theme === 'dark';
      for (const d of dusts) {
        const m = d.material as THREE.ShaderMaterial;
        m.uniforms.uOpacity.value = dark ? 0.78 : 0.42;
        m.blending = blend();
        m.needsUpdate = true;
      }
      glow.material.opacity = dark ? 0.4 : 0.08;
      for (const sp of [glow, ...fociGlow, ...(state.engine ? [state.engine] : [])]) {
        sp.material.blending = blend();
        sp.material.needsUpdate = true;
      }
      fociGlow.forEach((sp) => (sp.material.opacity = dark ? 0.2 : 0.05));
      for (const w of worlds) {
        if (w.air) (w.air.material as THREE.ShaderMaterial).uniforms.uStrength.value = dark ? 0.8 : 0.4;
        w.body?.setTheme(theme);
        w.sig?.setTheme(theme, hues(w.p));
      }
    }
    applyTheme();

    const tmp = new THREE.Vector3(), ahead = new THREE.Vector3();
    // the galaxy's own key light: high, to the left and towards the viewer, so every world shows a lit side and a terminator
    const keyLight = center.clone().add(new THREE.Vector3(-70, 60, 85));
    function update(dt: number, time: number, motion: number, camera: THREE.Camera, target: THREE.Vector3, hovered: { kind: string; id: string } | null) {
      const near = target.distanceTo(center) < 85 && camera.position.distanceTo(center) < 240;
      state.near = near;
      farHit.layers.set(near ? FAR_LAYER : 0);
      for (const d of dusts) d.rotation.y += dt * 0.008 * motion;
      rim.rotation.z += dt * 0.2 * motion;
      if (near && !state.built) build();
      // unfold on arrival, fold away on leaving
      state.reveal = motion ? clamp01(state.reveal + (near ? dt / 0.9 : -dt / 0.35)) : near ? 1 : 0;
      const open = state.reveal > 0.001;
      detail.visible = open;
      coreLabel.hidden = !near;
      for (const w of worlds) w.label.hidden = !near;
      if (!open || !state.built) return;

      const n = worlds.length;
      worlds.forEach((w, j) => {
        const k = back(clamp01(state.reveal * 1.7 - (j / n) * 0.7));
        const hot = hovered?.kind === 'scenekit' && hovered.id === `${g.id}:${w.p.id}` ? 1 : 0;
        w.pulse += (Math.max(hot, state.seg === j && state.wait > 0 ? 0.6 : 0) - w.pulse) * Math.min(1, dt * 8);
        w.world.scale.setScalar(Math.max(0.001, k) * (1 + w.pulse * 0.1));
        if (w.globe) w.globe.rotation.y += dt * 0.05 * motion;
        w.body?.update(dt, time, motion, keyLight);
        if (w.air) (w.air.material as THREE.ShaderMaterial).uniforms.uStrength.value = (theme === 'dark' ? 0.8 : 0.4) * (1 + w.pulse * 0.9);
        w.sig?.tick(time, dt * motion);
        w.label.classList.toggle('active', state.seg === j && state.wait > 0);
      });
      // the route draws itself from the first kit
      const drawn = ease.out(clamp01(state.reveal * 1.4 - 0.25));
      state.routeLine!.geometry.setDrawRange(0, Math.max(2, Math.round((ROUTE_PTS + 1) * drawn)));

      // courier: wait at a kit while it works, then carry the file on
      const courier = state.courier!, cargo = state.cargo!;
      const last = stops.length - 1;
      if (!motion) {
        courier.position.copy(stops[last]);
        cargo.visible = false;
        state.delivered = n;
      } else if (state.reveal >= 1) {
        if (state.wait > 0) {
          state.wait -= dt;
          if (state.wait <= 0 && state.seg === last) {
            // delivered everything: start the next run
            state.seg = 0;
            state.delivered = 0;
            state.wait = 1.4;
            courier.position.copy(stops[0]);
          }
        } else {
          state.t += dt / 2.6;
          const u = (state.seg + ease.inOut(Math.min(1, state.t))) / last;
          route.getPoint(u, courier.position);
          route.getPoint(Math.min(1, u + 0.01), ahead);
          if (ahead.distanceToSquared(courier.position) > 1e-6) courier.lookAt(root.localToWorld(tmp.copy(ahead)));
          if (state.t >= 1) {
            state.t = 0;
            state.delivered = Math.max(state.delivered, state.seg + 1);
            state.seg += 1;
            state.wait = state.seg === last ? 3.2 : 1.7;
          }
        }
        courier.position.y += Math.sin(time * 3) * 0.02;
      }
      // the cargo is the file of the kit the courier last left; at the deck it has been handed over
      const carrying = Math.min(n - 1, state.wait > 0 ? state.seg : state.seg);
      cargo.visible = motion > 0 && state.seg < last;
      if (cargo.visible) {
        cargo.material.map = state.textures[carrying];
        cargo.position.copy(courier.position).add(tmp.set(0, 2.3, 0));
        cargo.material.opacity = state.reveal;
      }
      state.cards.forEach((c, j) => {
        const want = j < state.delivered || (state.seg === last && state.wait > 0) ? 1 : 0.22;
        c.lit += (want - c.lit) * Math.min(1, dt * 4);
        c.sp.material.opacity = c.lit * state.reveal;
        c.sp.position.copy(c.home).setY(c.home.y + Math.sin(time * 0.9 + j * 1.3) * 0.22 * motion);
        const s = 0.9 + (c.lit - 0.22) * 0.13;
        c.sp.scale.set(CARD_W * s, CARD_H * s, 1);
      });
    }

    return { id: g.id, center, root, update, applyTheme, state, kits: g.kits.map((k) => k.id) };
  });

  return {
    systems,
    setTheme(next: Theme) {
      theme = next;
      const dark = theme === 'dark';
      glass.emissiveIntensity = dark ? 0.9 : 0.2;
      systems.forEach((s) => s.applyTheme());
    },
    update(dt: number, time: number, motion: number, camera: THREE.Camera, target: THREE.Vector3, hovered: { kind: string; id: string } | null = null) {
      systems.forEach((s) => s.update(dt, time, motion, camera, target, hovered));
    },
  };
}
