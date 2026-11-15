// The home page star map, an infinite canvas: the KHP galaxy (KHP star, 16 kit
// planets in 4 clusters, agent ships, AI and UI stations, the empty
// next orbit, a hidden black hole), the Product Galaxy and scenario galaxies.
// Loaded lazily (dynamic import) only after the static poster has painted.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { layoutPlanets, polar, presetFor, vfovFor, STAR_RADIUS, PLANET_RADIUS } from '../../lib/layout';
import { visited, markGalaxy, TOTAL_PLANETS } from '../chrome';
import { reducedMotion } from './support';
import { bloom } from './post';
import { deepSpace } from './deepSpace';
import { productGalaxy, type ProductKind } from './productGalaxy';
import { planetBody, type PlanetBody } from './planetSurface';
import { scenarioGalaxies, type ScenarioKind } from './scenarioGalaxies';
import { legacyScenario } from '../../lib/scenarioGalaxies';
import {
  atmosphere,
  coronaTexture,
  currentTheme,
  galaxyDust,
  dotTexture,
  ease,
  FrameGuard,
  uploadTextures,
  yieldToMain,
  glowTexture,
  initialPixelRatio,
  palette,
  rng,
  type Theme,
} from './common';
import type { ScenePlanet, UniverseSceneData } from './types';

type Kind = 'planet' | 'star' | 'ship' | 'station' | 'galaxy' | 'blackhole' | 'newkit' | ProductKind | ScenarioKind;
interface Target {
  kind: Kind;
  id: string;
  object: THREE.Object3D; // what the label follows
  hit: THREE.Object3D[]; // raycast meshes
  label: HTMLButtonElement;
  radius: number;
  labelOffset: number; // label sits this many radii below the object
}


export async function mountUniverse(root: HTMLElement, data: UniverseSceneData) {
  const S = data.strings;
  const fmt = (k: string, v: Record<string, string> = {}) => (S[k] || k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
  const reduced = reducedMotion();
  let theme: Theme = currentTheme();
  let pal = palette(theme);

  // ── renderer, camera, controls ────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  root.querySelector('.scene-layer')!.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: initialPixelRatio() < 1.5, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(initialPixelRatio());
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 2000);
  let preset = presetFor(root.clientWidth / Math.max(1, root.clientHeight));
  camera.position.set(...preset.position);
  camera.lookAt(0, 0, 0);

  const post = bloom(renderer, scene, camera, theme);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 12;
  controls.maxDistance = 1600;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = 1.45;
  controls.screenSpacePanning = false;
  // an infinite canvas: drag moves across the map, right-drag (or Shift/Ctrl + drag) turns it
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.panSpeed = 1;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.18;
  controls.keys = { LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown' };
  let touched = false;
  let resumeTimer = 0;
  controls.addEventListener('start', () => {
    touched = true;
    controls.autoRotate = false;
    clearTimeout(resumeTimer);
  });
  controls.addEventListener('end', () => {
    clearTimeout(resumeTimer);
    if (!reduced) resumeTimer = window.setTimeout(() => (controls.autoRotate = true), 12000);
  });

  // ── lights and backdrop ───────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0xffffff, pal.ambient);
  scene.add(ambient);
  const sun = new THREE.PointLight(0xffd7a0, 3.2, 0, 0);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xcfd8ff, 0x2a1f4f, 0.35);
  scene.add(hemi);

  const space = await deepSpace(scene, theme, innerWidth < 700);

  await yieldToMain();
  // Everything that orbits the star lives in `galaxy`, which turns slowly.
  const galaxy = new THREE.Group();
  scene.add(galaxy);
  const dust = galaxyDust(innerWidth < 700 ? 5000 : 11000, 7, 64);
  galaxy.add(dust);
  const dustMat = dust.material as THREE.ShaderMaterial;
  // soft glow of the galactic disc, lying flat under the star
  const discGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshBasicMaterial({ map: glowTexture('rgba(150,110,255,1)', 'rgba(150,110,255,0)'), transparent: true, depthWrite: false, opacity: 0.16, blending: THREE.AdditiveBlending }),
  );
  discGlow.rotation.x = -Math.PI / 2;
  discGlow.position.y = -1.5;
  galaxy.add(discGlow);

  const targets: Target[] = [];
  const labels = root.querySelector<HTMLElement>('.scene-labels')!;
  const mkLabel = (kind: Kind, id: string, html: string, aria: string, style = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `lbl lbl-${kind}`;
    b.dataset.kind = kind;
    b.dataset.id = id;
    b.innerHTML = html;
    // the accessible name starts with what the label shows (WCAG 2.5.3)
    const shown = [...b.querySelectorAll('.n, .k')].map((e) => e.textContent?.trim()).filter(Boolean).join(' ');
    b.setAttribute('aria-label', shown && !aria.includes(shown) ? `${shown}: ${aria}` : aria);
    if (style) b.setAttribute('style', style);
    labels.appendChild(b);
    return b;
  };

  // ── the star: Kit Harness Protocol ────────────────────────────────
  const starUniforms = { uTime: { value: 0 } };
  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    vertexShader: /* glsl */ `
      varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*n3(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 p = normalize(vP)*2.2;
        float n = fbm(p + vec3(uTime*0.08, uTime*0.05, 0.0));
        float m = fbm(p*2.6 - vec3(0.0, uTime*0.11, uTime*0.07));
        vec3 c = mix(vec3(1.0,0.42,0.12), vec3(1.0,0.86,0.45), smoothstep(0.3,0.75,n));
        c = mix(c, vec3(1.0,0.93,0.7), smoothstep(0.62,0.9,m)*0.6);
        float rim = pow(1.0 - max(dot(vN,vV),0.0), 2.0);
        c = c*0.78 + vec3(1.0,0.55,0.2)*rim*0.5;
        gl_FragColor = vec4(c,1.0);
      }`,
  });
  const starMesh = new THREE.Mesh(new THREE.SphereGeometry(STAR_RADIUS, 64, 40), starMat);
  scene.add(starMesh);
  const starGlows = [
    { s: STAR_RADIUS * 5.2, o: 0.55, c: 'rgba(255,170,70,1)' },
    { s: STAR_RADIUS * 2.9, o: 0.75, c: 'rgba(255,220,140,1)' },
  ].map(({ s, o, c }) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(c, c.replace(',1)', ',0)')), transparent: true, depthWrite: false, opacity: o, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(s);
    sp.userData.base = o;
    scene.add(sp);
    return sp;
  });
  const corona = [0, 1].map((k) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaTexture(), transparent: true, depthWrite: false, opacity: 0.5 - k * 0.18, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(STAR_RADIUS * (4.6 + k * 1.6));
    scene.add(sp);
    return sp;
  });
  targets.push({
    kind: 'star',
    id: 'khp',
    object: starMesh,
    hit: [starMesh],
    radius: STAR_RADIUS,
    labelOffset: 1.45,
    label: mkLabel('star', 'khp', `<span class="n">${data.star.short}</span><span class="k">${data.star.name}</span>`, `${data.star.name}: ${data.star.tagline}`),
  });

  // ── planets ───────────────────────────────────────────────────────
  const pos = layoutPlanets(data.clusters, data.planets);
  interface PlanetObj {
    p: ScenePlanet;
    group: THREE.Group;
    mesh: THREE.Mesh;
    body: PlanetBody;
    atmo: THREE.Mesh;
    spin: number;
    hover: number;
    seen: THREE.Mesh;
    beacon?: THREE.Mesh;
  }
  const planets = new Map<string, PlanetObj>();
  const orbitMat = new THREE.LineBasicMaterial({ color: pal.orbit, transparent: true, opacity: pal.orbitOpacity * .6, depthWrite: false });
  const seenSet = new Set(visited());
  const scaffoldMat = new THREE.LineBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 });

  for (const [i, p] of data.planets.entries()) {
    if (i % 3 === 2) await yieldToMain();
    const group = new THREE.Group();
    group.position.set(...pos[p.id]);
    galaxy.add(group);
    // the globe: its own look, lit from the star, with clouds, rings and moons where it has them
    const body = planetBody(p, i + 1, theme, PLANET_RADIUS);
    const R = body.radius;
    const mesh = body.surface;
    group.add(body.group);
    const atmo = atmosphere(R * 1.14, theme === 'dark' ? p.color.dark : p.color.light, theme === 'dark' ? 0.9 : 0.5);
    group.add(atmo);

    let beacon: THREE.Mesh | undefined;
    if (p.surface.scaffold) {
      group.add(scaffold(R, scaffoldMat, p.id === 'cad'));
      beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: '#ff8a3d' }));
      beacon.position.set(0, R * 1.62, 0);
      group.add(beacon);
    }
    // green "visited" marker
    const seen = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: '#3fd17b' }));
    seen.position.set(R * 0.85, R * 0.85, 0);
    seen.visible = seenSet.has(p.id);
    group.add(seen);

    // orbit around the star
    const orbitR = Math.hypot(pos[p.id][0], pos[p.id][2]);
    const pts = Array.from({ length: 129 }, (_, k) => new THREE.Vector3(Math.cos((k / 128) * Math.PI * 2) * orbitR, 0, Math.sin((k / 128) * Math.PI * 2) * orbitR));
    galaxy.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat));

    const preview = p.status === 'preview';
    const label = mkLabel(
      'planet',
      p.id,
      `<span class="dot"></span><span class="n">${p.name}</span><span class="k">${p.nick}${preview ? ' · <em>Preview</em>' : ''}</span>`,
      `${fmt('scene.land', { name: p.name })} · ${p.nick}${preview ? ' · ' + S['planet.status.preview'] : ''}`,
      `--kit:${theme === 'dark' ? p.color.dark : p.color.light}`,
    );
    label.dataset.light = p.color.light;
    label.dataset.dark = p.color.dark;
    targets.push({ kind: 'planet', id: p.id, object: group, hit: [mesh], label, radius: R, labelOffset: 1.3 });
    planets.set(p.id, { p, group, mesh, body, atmo, spin: 0.05 + ((i * 37) % 10) * 0.008, hover: 0, seen, beacon });
  }

  // cluster names float above each cluster (decorative; the planets carry the semantics)
  const clusterTags = data.clusters.map((c) => {
    const el = document.createElement('div');
    el.className = 'cluster-tag';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = c.label;
    labels.appendChild(el);
    const o = new THREE.Object3D();
    const lift: Record<string, number> = { office: 11, design: -7, video: 6, cad: 10 };
    // design sits under the headline, so its name goes on the outer side instead of above
    o.position.set(...(c.id === 'design' ? polar(c.angle, c.distance + 11, 0) : polar(c.angle, c.distance, lift[c.id] ?? 6)));
    galaxy.add(o);
    return { el, o };
  });

  await yieldToMain();
  // ── stations ──────────────────────────────────────────────────────
  const stationSpin: THREE.Object3D[] = [];
  const marketWindows: { mesh: THREE.InstancedMesh; colors: THREE.Color[] } [] = [];
  const gateUniforms = { uTime: { value: 0 } };
  for (const st of data.stations) {
    const g = new THREE.Group();
    g.position.set(...polar(st.angle, st.distance, st.height));
    galaxy.add(g);
    const hull = new THREE.MeshStandardMaterial({ color: '#d9dcef', roughness: 0.45, metalness: 0.6 });
    const hits: THREE.Object3D[] = [];
    if (st.kind === 'market') {
      const ring = new THREE.Group();
      const torus = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.38, 16, 64), hull);
      torus.rotation.x = Math.PI / 2;
      ring.add(torus);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), hull);
      ring.add(hub);
      for (let k = 0; k < 4; k++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), hull);
        spoke.rotation.z = Math.PI / 2;
        spoke.rotation.y = (k * Math.PI) / 2;
        spoke.position.set(Math.cos((k * Math.PI) / 2) * 1.2, 0, -Math.sin((k * Math.PI) / 2) * 1.2);
        ring.add(spoke);
      }
      // windows: each one glows in a kit colour and the colours scroll around the ring
      const N = 28;
      const win = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.26, 0.06), new THREE.MeshBasicMaterial({ color: '#ffffff' }), N);
      const m4 = new THREE.Matrix4();
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0));
        m4.compose(new THREE.Vector3(Math.cos(a) * 2.79, 0, Math.sin(a) * 2.79), q, new THREE.Vector3(1, 1, 1));
        win.setMatrixAt(k, m4);
      }
      const colors = data.planets.map((p) => new THREE.Color(p.color.dark));
      ring.add(win);
      marketWindows.push({ mesh: win, colors });
      g.add(ring);
      stationSpin.push(ring);
      hits.push(torus, hub);
    } else if (st.kind === 'ui') {
      // Tessera's professional UI components form a modular orbital workshop.
      const hub = new THREE.Mesh(new THREE.OctahedronGeometry(1.15), new THREE.MeshStandardMaterial({ color: '#9a8bff', emissive: '#8b7cf0', emissiveIntensity: .7, metalness: .55, roughness: .3 }));
      g.add(hub);
      hits.push(hub);
      for (let k = 0; k < 4; k++) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, .18), hull);
        const angle = k * Math.PI / 2;
        panel.position.set(Math.cos(angle) * 2.5, .25, Math.sin(angle) * 2.5);
        panel.rotation.y = -angle;
        g.add(panel);
        hits.push(panel);
        const window = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .8), new THREE.MeshBasicMaterial({ color: '#b5a9ff', side: THREE.DoubleSide }));
        window.position.z = .1;
        panel.add(window);
      }
      stationSpin.push(hub);
    } else {
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.6, 20), hull);
      g.add(core);
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 0.5), hull);
        arm.position.x = s * 2.2;
        g.add(arm);
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.2), hull);
        pod.position.x = s * 3.9;
        g.add(pod);
        hits.push(arm, pod);
      }
      const gate = new THREE.Group();
      gate.position.set(0, 0, 2.6);
      const gateRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.22, 12, 48), new THREE.MeshStandardMaterial({ color: '#7fe3ff', emissive: '#2fb8ff', emissiveIntensity: 1.2 }));
      gate.add(gateRing);
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(1.85, 48),
        new THREE.ShaderMaterial({
          uniforms: gateUniforms,
          vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
          fragmentShader: /* glsl */ `uniform float uTime; varying vec2 vUv;
            void main(){ vec2 p = vUv-0.5; float r = length(p)*2.0; float a = atan(p.y,p.x);
              float s = sin(a*5.0 + r*14.0 - uTime*3.0)*0.5+0.5; vec3 c = mix(vec3(0.15,0.55,1.0), vec3(0.75,0.95,1.0), s);
              gl_FragColor = vec4(c, (1.0-r)*0.85); }`,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      gate.add(disc);
      g.add(gate);
      stationSpin.push(gate);
      hits.push(core, gateRing, disc);
      g.rotation.y = 0.6;
    }
    targets.push({
      kind: 'station',
      id: st.id,
      object: g,
      hit: hits,
      radius: 2.6,
      labelOffset: 1.3,
      label: mkLabel('station', st.id, `<span class="n">${st.name}</span>`, `${st.name}: ${st.title}`, st.kind === 'ai' ? '--station:#77d8ee' : st.kind === 'ui' ? '--station:#b7a3ff' : ''),
    });
  }

  // ── unknown galaxies ──────────────────────────────────────────────
  const farGalaxies: THREE.Points[] = [];
  data.galaxies.forEach((gx, gi) => {
    const r = rng(101 + gi * 17);
    const N = 1600;
    const arr = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const c1 = new THREE.Color(gi ? '#9fd4ff' : '#d4b8ff');
    const c2 = new THREE.Color('#ffffff');
    for (let k = 0; k < N; k++) {
      const arm = k % 2;
      const d = Math.pow(r(), 0.7) * 20;
      const a = d * 0.32 + arm * Math.PI + (r() - 0.5) * 0.6;
      arr.set([Math.cos(a) * d, (r() - 0.5) * 1.4, Math.sin(a) * d], k * 3);
      const c = c1.clone().lerp(c2, 1 - d / 20);
      col.set([c.r, c.g, c.b], k * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, map: dotTexture() }));
    pts.position.set(...gx.position);
    pts.rotation.set(0.9 + gi * 0.3, gi, 0.25);
    scene.add(pts);
    farGalaxies.push(pts);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(16, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    pts.add(hit);
    targets.push({
      kind: 'galaxy',
      id: gx.id,
      object: pts,
      hit: [hit],
      radius: 14,
      labelOffset: 1,
      label: mkLabel('galaxy', gx.id, `<span class="n">${gx.name}</span><span class="k">Build your own on KHP</span>`, `${gx.name}: ${gx.body}`),
    });
  });

  // ── black hole (appears once every planet has been visited) ──────
  const holeUniforms = { uTime: { value: 0 } };
  const hole = new THREE.Group();
  hole.position.set(...polar(-150, 62, -4));
  hole.visible = false;
  {
    const core = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 20), new THREE.MeshBasicMaterial({ color: '#000000' }));
    hole.add(core);
    const disk = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 7.5, 128, 1),
      new THREE.ShaderMaterial({
        uniforms: holeUniforms,
        vertexShader: /* glsl */ `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `uniform float uTime; varying vec3 vP;
          void main(){ float r = (length(vP.xy)-2.5)/5.0; float a = atan(vP.y,vP.x);
            float s = sin(a*7.0 - r*18.0 + uTime*2.4)*0.5+0.5; vec3 c = mix(vec3(1.0,0.75,0.35), vec3(0.6,0.25,1.0), r);
            gl_FragColor = vec4(c*(0.7+s*0.6), (1.0-r)*(0.55+s*0.45)); }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    disk.rotation.x = -Math.PI / 2 + 0.3;
    hole.add(disk);
    galaxy.add(hole);
    targets.push({
      kind: 'blackhole',
      id: 'blackhole',
      object: hole,
      hit: [core, disk],
      radius: 2.2,
      labelOffset: 2.4,
      label: mkLabel('blackhole', 'blackhole', `<span class="n">${S['scene.blackhole']}</span>`, S['scene.blackhole']),
    });
  }
  const holeTarget = targets[targets.length - 1];
  const syncHole = (announce: boolean) => {
    const open = new Set(visited()).size >= TOTAL_PLANETS;
    if (open && !hole.visible && announce) toast(S['home.badge']);
    hole.visible = open;
    holeTarget.label.hidden = !open;
  };
  syncHole(false);

  // ── agent ships ───────────────────────────────────────────────────
  interface Ship {
    g: THREE.Group;
    curve: THREE.QuadraticBezierCurve3;
    t: number;
    dur: number;
    phase: 'fly' | 'land';
    wait: number;
    to: string;
    trail: THREE.Line;
    trailPts: Float32Array;
    engine: THREE.Sprite;
  }
  const ships: Ship[] = [];
  const shipHull = new THREE.MeshStandardMaterial({ color: '#f4f2ff', roughness: 0.35, metalness: 0.4, emissive: '#5645d4', emissiveIntensity: 0.15 });
  const ids = data.planets.map((p) => p.id);
  const sr = rng(77);
  const surfacePoint = (id: string) => new THREE.Vector3(...pos[id]).add(new THREE.Vector3(0, PLANET_RADIUS * 1.35, 0));
  const flight = (from: THREE.Vector3, to: string) => {
    const end = surfacePoint(to);
    const mid = from.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 6 + from.distanceTo(end) * 0.18, 0));
    return new THREE.QuadraticBezierCurve3(from.clone(), mid, end);
  };
  const SHIPS = innerWidth < 700 ? 4 : 6;
  for (let k = 0; k < SHIPS; k++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.0, 10), shipHull);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.36), shipHull);
    wing.position.z = -0.2;
    g.add(wing);
    const engine = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,1)'), color: '#9ad7ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    engine.position.z = -0.6;
    engine.scale.setScalar(0.9);
    g.add(engine);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    g.add(hit);
    galaxy.add(g);
    const TRAIL = 36;
    const trailPts = new Float32Array(TRAIL * 3);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(trailPts, 3));
    const alpha = new Float32Array(TRAIL).map((_, i) => 1 - i / TRAIL);
    tg.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    const trail = new THREE.Line(
      tg,
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color('#9ad7ff') } },
        vertexShader: /* glsl */ `attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA*0.7); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    trail.frustumCulled = false;
    galaxy.add(trail);
    const start = ids[Math.floor(sr() * ids.length)];
    let to = ids[Math.floor(sr() * ids.length)];
    if (to === start) to = ids[(ids.indexOf(start) + 3) % ids.length];
    const from = surfacePoint(start);
    for (let i = 0; i < TRAIL; i++) trailPts.set([from.x, from.y, from.z], i * 3);
    const ship: Ship = { g, curve: flight(from, to), t: sr() * 0.8, dur: 7 + sr() * 5, phase: 'fly', wait: 0, to, trail, trailPts, engine };
    ships.push(ship);
    targets.push({
      kind: 'ship',
      id: String(k),
      object: g,
      hit: [hit],
      radius: 0.6,
      labelOffset: 1.6,
      label: mkLabel('ship', String(k), `<span class="ship-dot"></span>`, `${S['scene.ship']}: ${planets.get(to)!.p.ship}`),
    });
    // moving targets make poor buttons: ships stay clickable on the canvas, and
    // what they do is listed in the "Agent ships" section below the map
    const sl = targets[targets.length - 1].label;
    sl.tabIndex = -1;
    sl.setAttribute('aria-hidden', 'true');
    sl.style.pointerEvents = 'none';
  }
  const shipTarget = (k: number) => targets.find((t) => t.kind === 'ship' && t.id === String(k))!;

  // ── the next orbit: an empty orbit and a hologram planet waiting for a new kit ──
  const newKitUniforms = { uTime: { value: 0 } };
  const newKit = new THREE.Group();
  newKit.position.set(...polar(data.newKit.angle, data.newKit.distance, data.newKit.height));
  galaxy.add(newKit);
  {
    const R = data.newKit.distance;
    const pts = Array.from({ length: 257 }, (_, k) => new THREE.Vector3(Math.cos((k / 256) * Math.PI * 2) * R, 0, Math.sin((k / 256) * Math.PI * 2) * R));
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#ffd27a', dashSize: 1.4, gapSize: 1.6, transparent: true, opacity: 0.45, depthWrite: false }));
    orbit.computeLineDistances();
    galaxy.add(orbit);
    const holo = new THREE.Mesh(
      new THREE.SphereGeometry(PLANET_RADIUS, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: newKitUniforms,
        vertexShader: /* glsl */ `varying vec3 vP; varying vec3 vN; varying vec3 vV;
          void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: /* glsl */ `uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
          void main(){ vec3 n = normalize(vP); float lat = abs(fract(asin(n.y)*3.82 + 0.5) - 0.5); float lon = abs(fract(atan(n.z,n.x)*1.91 + uTime*0.05) - 0.5);
            float grid = smoothstep(0.44, 0.5, max(lat, lon));
            float scan = smoothstep(0.92, 1.0, fract(n.y*2.0 - uTime*0.4));
            float rim = pow(1.0 - max(dot(vN,vV),0.0), 2.5);
            gl_FragColor = vec4(1.0, 0.8, 0.45, grid*0.42 + scan*0.16 + rim*0.22); }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: pal.glowBlending,
      }),
    );
    newKit.add(holo);
    targets.push({
      kind: 'newkit',
      id: 'newkit',
      object: newKit,
      hit: [holo],
      radius: PLANET_RADIUS,
      labelOffset: 1.3,
      label: mkLabel('newkit', 'newkit', `<span class="n">+ ${data.newKit.title}</span><span class="k">${data.newKit.name}</span>`, `${data.newKit.title}: ${data.newKit.body}`),
    });
  }

  // ── the Product Galaxy, a drag away on the same canvas ────────────
  await yieldToMain();
  const kitTop = new THREE.Vector3(0, PLANET_RADIUS * 1.1, 0);
  const pg = productGalaxy({
    scene,
    data: data.productGalaxy,
    planets: data.planets,
    theme,
    small: innerWidth < 700,
    mkLabel: (kind, id, html, aria, style) => mkLabel(kind, id, html, aria, style),
    addTarget: (t) => targets.push(t),
    kitWorld: (id, out) => planets.get(id)!.group.localToWorld(out.copy(kitTop)),
  });
  const KHP_CENTER = new THREE.Vector3();
  // From far away a galaxy is its whole disc of dust: clicking anywhere on it flies in.
  // These unseen discs are only hit while the galaxy is seen from afar (layer 1 is not raycast).
  const farDisc = (radius: number, at: THREE.Vector3) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    m.scale.y = 0.22;
    m.position.copy(at);
    scene.add(m);
    return m;
  };
  const khpFar = farDisc(62, KHP_CENTER);
  const productsFar = farDisc(46, pg.center);
  targets.find((t) => t.kind === 'star')!.hit.push(khpFar);
  targets.find((t) => t.kind === 'sdk')?.hit.push(productsFar);
  const khpDetail=new THREE.Group();
  for(const child of [...galaxy.children]) if(child!==dust && child!==discGlow) khpDetail.add(child);
  galaxy.add(khpDetail);
  const sg = scenarioGalaxies({scene, data:data.scenarioGalaxies, planets:data.planets, theme, small:innerWidth<700, mkLabel, addTarget:t=>targets.push(t)});
  // big decorative names over each galaxy; the one you are in fades out
  const galaxyTags = [
    { id: 'khp', text: S['galaxy.khp'], at: new THREE.Vector3(0, 26, -30), center: KHP_CENTER },
    { id: 'products', text: data.productGalaxy.name, at: pg.center.clone().add(new THREE.Vector3(0, 20, -22)), center: pg.center },
    ...sg.systems.map(g=>({id:g.id,text:data.scenarioGalaxies.find(s=>s.id===g.id)!.name,at:g.center.clone().add(new THREE.Vector3(0,14,-8)),center:g.center})),
  ].map((g) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'galaxy-tag';
    el.addEventListener('click',()=>travelTo(g.id));
    el.textContent = g.text;
    labels.appendChild(el);
    return { ...g, el };
  });
  // In the overview, pointing at a scenario galaxy draws lines to the kit planets it is made of.
  let linkFocus: string | null = null;
  let linkAlpha = 0;
  let linkShown: string | null = null;
  const LINK_PTS = 32;
  const linkLines = Array.from({ length: 4 }, () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINK_PTS * 3), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    line.frustumCulled = false;
    line.visible = false;
    scene.add(line);
    return line;
  });
  const linkCurve = new THREE.QuadraticBezierCurve3();
  for (const g of galaxyTags) {
    if (!sg.systems.some((s) => s.id === g.id)) continue;
    const kits = sg.systems.find((s) => s.id === g.id)!.kits;
    g.el.dataset.kits = kits.join(' · ');
    g.el.addEventListener('pointerenter', () => (linkFocus = g.id));
    g.el.addEventListener('pointerleave', () => linkFocus === g.id && (linkFocus = null));
    g.el.addEventListener('focus', () => (linkFocus = g.id));
    g.el.addEventListener('blur', () => linkFocus === g.id && (linkFocus = null));
  }
  function updateLinks(dt: number, overview: boolean) {
    const want = overview ? linkFocus ?? (hovered?.kind === 'scenario' ? hovered.id : null) : null;
    if (want) linkShown = want;
    linkAlpha += ((want ? 1 : 0) - linkAlpha) * Math.min(1, dt * 7);
    const sys = linkShown ? sg.systems.find((s) => s.id === linkShown) : null;
    linkLines.forEach((line, i) => {
      const kit = sys?.kits[i];
      line.visible = !!kit && linkAlpha > 0.02;
      if (!line.visible) return;
      const p = planets.get(kit!)!;
      p.group.getWorldPosition(linkCurve.v0);
      linkCurve.v2.copy(sys!.center);
      linkCurve.v1.copy(linkCurve.v0).lerp(linkCurve.v2, 0.5).setY(linkCurve.v0.distanceTo(linkCurve.v2) * 0.16);
      const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let k = 0; k < LINK_PTS; k++) {
        linkCurve.getPoint(k / (LINK_PTS - 1), tmp);
        pos.setXYZ(k, tmp.x, tmp.y, tmp.z);
      }
      pos.needsUpdate = true;
      const m = line.material as THREE.LineBasicMaterial;
      m.color.set(theme === 'dark' ? p.p.color.dark : p.p.color.light);
      m.blending = theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
      m.opacity = linkAlpha * 0.9;
    });
    for (const g of galaxyTags) g.el.classList.toggle('linked', !!want && g.id === want);
    root.classList.toggle('linking', !!want);
  }
  // edge chips point at the other galaxy when it is off screen; click to fly there
  const edgeChips = galaxyTags.map((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'edge-chip';
    b.dataset.go = g.id;
    b.innerHTML = `<span class="arrow" aria-hidden="true">➜</span><span>${g.text}</span>`;
    b.setAttribute('aria-label', fmt('galaxy.goto', { name: g.text }));
    labels.appendChild(b);
    // tall screens see a galaxy from far away; come in closer when arriving
    b.addEventListener('click', () => travelTo(g.id));
    return { ...g, b };
  });

  // ── panel, toast and warp overlay (HTML) ──────────────────────────
  const panel = root.querySelector<HTMLElement>('.scene-panel')!;
  const panelKind = panel.querySelector<HTMLElement>('.p-kind')!;
  const panelTitle = panel.querySelector<HTMLElement>('.p-title')!;
  const panelBody = panel.querySelector<HTMLElement>('.p-body')!;
  const panelActions = panel.querySelector<HTMLElement>('.p-actions')!;
  let panelReturn: HTMLElement | null = null;
  let openShip = -1;
  const G = data.productGalaxy;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const scenarioIndexHref = `${base}${data.lang === 'zh' ? '/zh' : ''}/scenarios/`;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

  function openPanel(kind: Kind, id: string, from?: HTMLElement | null) {
    panelReturn = from ?? (document.activeElement as HTMLElement | null);
    openShip = -1;
    let k = '', title = '', body = '', actions = '';
    const zh = data.lang === 'zh';
    // "related": links to the page about this very thing, never to a home page
    const related = (links: [string, string][]) => `<p class="rel-h">${zh ? '相关文档' : 'Related'}</p><ul class="rel">${links.map(([text, url]) => `<li><a href="${url}">${esc(text)} →</a></li>`).join('')}</ul>`;
    const thumbButton = (r: { id: string; thumb: string; goal: string }, alt: string) =>
      `<button class="p-thumb" type="button" data-replay="${r.id}"><img src="${r.thumb}" alt="${esc(alt)}" loading="lazy" decoding="async"><span>▶ ${zh ? '回放这次 AI 操作' : 'Replay the agent run'}</span></button><p class="goal">${esc(r.goal)}</p>`;
    if (kind === 'planet') {
      const p = planets.get(id)!.p;
      k = p.nick + (p.status === 'preview' ? ` · ${S['planet.status.preview']}` : '');
      title = p.name;
      body = `<p class="facts" style="--kit:${p.color.dark}">${(p.facts ?? []).map((f) => `<span>${esc(f)}</span>`).join('')}</p><p class="world">${esc(p.world || '')}</p>` +
        (p.replay ? thumbButton(p.replay, p.name) : '') + `<p>${esc(p.tagline || '')}</p>` +
        (p.usedIn?.length ? `<p class="muted">${zh ? '用在这些场景星系' : 'Used in these scenario galaxies'}</p><p class="kits">${p.usedIn.map((g) => `<button type="button" data-travel="${g.id}" style="--kit:${g.color}">${esc(g.name)}</button>`).join('')}</p>` : '');
      body += related([[zh ? `${p.name} 能做什么` : `What ${p.name} can do`, `${p.href}#city`], [zh ? `AI 怎么调用 ${p.name}` : `How an agent calls ${p.name}`, `${p.href}#use-with-ai`], [zh ? '支持的文件格式' : 'File formats', `${p.href}#formats`]]);
      actions = `<a class="btn primary" href="${p.href}" data-land="${p.id}">${esc(fmt('scene.land', { name: p.name }))}</a>` +
        (p.replay ? `<button class="btn" type="button" data-replay="${p.replay.id}">▶ ${zh ? '回放' : 'Replay'}</button>` : '');
    } else if (kind === 'star') {
      k = S['home.starTitle'];
      title = data.star.name;
      body = `<p class="lines">${data.star.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</p><p>${esc(data.star.body)}</p>`;
      body += related([[zh ? '每个 kit 都回应的调用' : 'The calls every kit answers', `${data.star.page}#calls`], [zh ? 'Agent 工具参考（inspect / run / check、错误码）' : 'Agent tools reference (inspect / run / check, error codes)', data.agentDocs], [zh ? '接入你的 AI（MCP 配置）' : 'Connect your AI (MCP setup)', `${data.star.page}#mcp`]]);
      actions = `<a class="btn primary" href="${data.star.page}">${esc(S['nav.protocol'])}</a><a class="btn" href="${data.star.href}">kitharness.org</a>`;
    } else if (kind === 'station') {
      const st = data.stations.find((s) => s.id === id)!;
      k = st.name;
      title = st.title;
      body = `<p>${esc(st.body)}</p>`;
      if (st.kind === 'market') body += `<div class="swatches" aria-hidden="true">${data.planets.map((p) => `<i style="--kit:${p.color.dark}"></i>`).join('')}</div>`;
      if (st.kind === 'ai') {
        // the relay is where you watch an agent at work: one replay per kit that has one
        const shows = data.planets.filter((p) => p.replay);
        if (shows.length) body += `<p class="muted">${zh ? '看一次 AI 操作的回放：' : 'Watch a replay of an agent at work:'}</p><p class="kits">${shows.map((p) => `<button type="button" data-replay="${p.replay!.id}" style="--kit:${p.color.dark}">▶ ${esc(p.name)}</button>`).join('')}</p>`;
        body += related([[zh ? 'Agent 工具参考' : 'Agent tools reference', data.agentDocs], [zh ? '接入你的 AI（MCP 配置）' : 'Connect your AI (MCP setup)', `${data.star.page}#mcp`]]);
      }
      actions = st.kind === 'ai' ? `<button class="btn primary" data-travel="overview">${esc(st.cta)}</button><a class="btn" href="${scenarioIndexHref}">${data.lang==='zh'?'探索场景':'Explore scenarios'}</a>` : `<a class="btn primary" href="${st.href}">${esc(st.cta)}</a>`;
    } else if (kind === 'galaxy') {
      const gx = data.galaxies.find((g) => g.id === id)!;
      k = S['home.beyondTitle'];
      title = gx.name;
      body = `<p>${esc(gx.body)}</p>`;
      actions = `<a class="btn primary" href="${gx.href}">kitharness.org</a>`;
    } else if (kind === 'ship') {
      const s = ships[Number(id)];
      const p = planets.get(s.to)!.p;
      openShip = Number(id);
      k = S['scene.ship'];
      title = p.ship;
      body = `<p>${esc(S['home.shipsBody'])}</p>`;
      actions = `<a class="btn primary" href="${p.href}" data-land="${p.id}">${esc(fmt('scene.land', { name: p.name }))}</a>`;
    } else if (kind === 'blackhole') {
      k = S['scene.blackhole'];
      title = '🕳️';
      body = `<p>${esc(S['scene.blackholeBody'])}</p>`;
    } else if (kind === 'newkit') {
      const nk = data.newKit;
      k = nk.name;
      title = nk.title;
      body = `<p>${esc(nk.body)}</p>`;
      actions = `<a class="btn primary" href="${nk.href}">${esc(nk.cta)}</a><a class="btn" href="${nk.protocolPage}">${esc(S['nav.protocol'])}</a>`;
    } else if (kind === 'sdk') {
      k = G.name;
      title = G.sdk.name;
      body =
        `<p>${esc(G.sdk.body)}</p><ul class="forms">${G.delivery.map((d) => `<li><b>${esc(d.name)}</b> ${esc(d.body)}</li>`).join('')}</ul>` +
        `<p><span class="badge">${esc(G.sdk.license)}</span></p>`;
      body += related([[`${G.sdk.name} ${zh ? '指南' : 'guide'}`, G.sdk.docs], ...G.delivery.map((d) => [`${d.name}`, d.docs] as [string, string])]);
      actions = `<a class="btn primary" href="${G.sdk.docs}">${esc(S['galaxy.sdkDocs'])}</a><a class="btn" href="${G.listHref}">${esc(S['galaxy.allSettlements'])}</a>`;
    } else if (kind === 'delivery') {
      const d = G.delivery.find((x) => x.id === id)!;
      const users = G.products.filter((p) => p.delivery.includes(id));
      k = `${G.sdk.name} · ${S['galaxy.delivery']}`;
      title = d.name;
      body = `<p>${esc(d.body)}</p>` + (users.length ? `<p class="muted">${esc(S['galaxy.usedBy'])} ${users.map((p) => `<a href="${p.href}">${esc(p.name)}</a>`).join(', ')}</p>` : '');
      body += related([[zh ? `${d.name}：怎么接入` : `${d.name}: how to integrate`, d.docs]]);
      actions = `<a class="btn primary" href="${d.docs}">${zh ? `${d.name} 文档` : `${d.name} docs`}</a>`;
    } else if (kind === 'product') {
      const p = G.products.find((x) => x.id === id)!;
      k = S['galaxy.settlement'] + (p.byKition ? ' · by Kition' : '') + (p.statusLabel ? ` · ${p.statusLabel}` : '');
      title = p.name;
      body =
        `<p>${esc(p.tagline)}</p><p class="kits">${p.kits
          .map((kit) => {
            const pl = data.planets.find((x) => x.id === kit)!;
            return `<a href="${pl.href}" style="--kit:${pl.color.dark}">${pl.name}</a>`;
          })
          .join('')}</p><p class="muted">${esc(S['galaxy.delivery'])}: ${p.delivery.map(esc).join(' · ')}</p>`;
      actions = `<a class="btn primary" href="${p.href}">${esc(S['galaxy.details'])}</a>` + (p.url ? `<a class="btn" href="${p.url}" rel="${p.rel}">${esc(S['galaxy.visit'])}</a>` : '');
    } else if (kind === 'scenario' || kind === 'scenekit') {
      const [sceneId,kitId] = id.split(':');
      const g = data.scenarioGalaxies.find(g=>g.id===sceneId)!;
      k = data.lang==='zh' ? '场景星系' : 'SCENARIO GALAXY';
      title = g.name;
      if(kind==='scenekit') {
        const index=g.kits.findIndex(k=>k.id===kitId), kit=g.kits[index];
        k=`${g.name} · ${zh?'第':'STEP '}${index+1}${zh?' 步':''} / ${g.kits.length}`;title=`${kit.id} · ${kit.title}`;
        body=(kit.replay?thumbButton(kit.replay,kit.title):'')+`<p>${esc(kit.body)}</p>${kit.status==='preview'?'<p class="badge">Preview</p>':''}`;
        actions=(kit.replay?`<button class="btn primary" type="button" data-replay="${kit.replay.id}">▶ ${zh?'回放这一步':'Replay this step'}</button>`:'')+`<a class="btn${kit.replay?'':' primary'}" href="${kit.href}">${zh?'探索 Kit 能力':'Explore kit capabilities'}</a>`;
      } else {
        body=`<p>${esc(g.summary)}</p><ol class="steps">${g.kits.map((kit,i)=>{
          const p=data.planets.find(p=>p.id===kit.id)!;
          return `<li style="--signal:${p.color.dark}"><span class="no">${String(i+1).padStart(2,'0')}</span>${kit.replay?`<img src="${kit.replay.thumb}" alt="" loading="lazy" decoding="async">`:''}<span class="what"><b>${esc(kit.id)}</b> ${esc(kit.title)}<small>${esc(kit.ext)}</small></span>${kit.replay?`<button class="mini" type="button" data-replay="${kit.replay.id}" aria-label="${zh?'回放':'Replay'}: ${esc(kit.id)} ${esc(kit.title)}">▶</button>`:''}</li>`;
        }).join('')}</ol><p class="muted">${esc(g.outcome)}</p>` +
          (g.by ? `<p class="muted">${zh ? '提议者' : 'Proposed by'} ${g.by.url ? `<a href="${g.by.url}" rel="nofollow ugc noopener">${esc(g.by.name)}</a>` : esc(g.by.name)}</p>` : '');
        actions=`<a class="btn primary" href="${g.href}">${zh?'探索这个场景':'Explore this scenario'}</a>`;
      }
    } else if (kind === 'addproduct') {
      k = G.name;
      title = G.add.title;
      body = `<p>${esc(G.add.body)}</p>`;
      actions = `<a class="btn primary" href="${G.add.href}">${esc(G.add.cta)}</a><a class="btn" href="${G.add.badgeHref}">${esc(S['galaxy.badge'])}</a>`;
    }
    panelKind.textContent = k;
    panelTitle.textContent = title;
    panelBody.innerHTML = body;
    panelActions.innerHTML = actions;
    panel.hidden = false;
    panel.dataset.kind = kind;
    panelTitle.focus({ preventScroll: true });
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true;
    openShip = -1;
    panelReturn?.focus({ preventScroll: true });
  }
  panel.querySelector('.p-close')!.addEventListener('click', closePanel);
  panelActions.addEventListener('click', (e) => {
    const travel = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-travel]');
    if (travel) { travelTo(travel.dataset.travel!); return; }
    if (startReplay(e)) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-land]');
    if (a) {
      e.preventDefault();
      land(a.dataset.land!);
    }
  });

  // "replay" buttons hand over to the replay panel (src/scripts/replay.ts), which works without the scene too
  function startReplay(e: Event) {
    // the replay panel listens for these buttons itself; here they just must not count as anything else
    return !!(e.target as HTMLElement).closest<HTMLElement>('[data-replay]');
  }
  panelBody.addEventListener('click', (e) => {
    const travel = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-travel]');
    if (travel) travelTo(travel.dataset.travel!);
    else startReplay(e);
  });

  const toastEl = root.querySelector<HTMLElement>('.scene-toast')!;
  let toastTimer = 0;
  function toast(msg: string) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toastEl.hidden = true), 6000);
  }

  // ── warp → landing ────────────────────────────────────────────────
  const warp = root.querySelector<HTMLElement>('.scene-warp')!;
  const warpText = warp.querySelector<HTMLElement>('.w-text')!;
  let landing: { id: string; t: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; href: string } | null = null;
  const WARP = 0.75; // seconds; the planet page adds a short descent (total ≤ 1.2 s)

  function land(id: string) {
    const p = planets.get(id);
    if (!p || landing) return;
    const href = p.p.href;
    try {
      sessionStorage.setItem('ku-landing', id);
    } catch {
      /* the planet page just skips its descent */
    }
    if (reduced) {
      location.assign(href);
      return;
    }
    closePanel();
    const world = p.group.getWorldPosition(new THREE.Vector3());
    const dir = camera.position.clone().sub(world).normalize();
    landing = {
      id,
      t: 0,
      from: camera.position.clone(),
      to: world.clone().add(dir.multiplyScalar(PLANET_RADIUS * 2.2)).add(new THREE.Vector3(0, PLANET_RADIUS * 0.8, 0)),
      fromTarget: controls.target.clone(),
      toTarget: world,
      href,
    };
    controls.enabled = false;
    controls.autoRotate = false;
    warpText.textContent = fmt('scene.landing', { name: p.p.name });
    warp.style.setProperty('--kit', theme === 'dark' ? p.p.color.dark : p.p.color.light);
    warp.hidden = false;
    root.classList.add('warping');
    warp.querySelector<HTMLButtonElement>('.w-skip')!.focus({ preventScroll: true });
  }
  const finishLanding = () => landing && location.assign(landing.href);
  warp.querySelector('.w-skip')!.addEventListener('click', finishLanding);
  warp.addEventListener('pointerdown', finishLanding);
  // coming back with the browser's back button restores this page from bfcache
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    landing = null;
    warp.hidden = true;
    root.classList.remove('warping');
    controls.enabled = true;
    camera.fov = vfovFor(preset, camera.aspect);
    camera.updateProjectionMatrix();
  });

  // ── interaction: labels, raycast, keyboard ────────────────────────
  function activate(t: Target, from?: HTMLElement | null) {
    const destination=t.kind==='scenario'?t.id:t.kind==='star'?'khp':t.kind==='sdk'?'products':null;
    if(destination){
      const center=galaxyTags.find(g=>g.id===destination)!.center;
      if(camera.position.distanceTo(controls.target)>400 || controls.target.distanceTo(center)>80){travelTo(destination);return;}
    }
    if (t.kind === 'planet') {
      // lean the view towards the planet, then say what it is; landing is the panel's button
      const w = t.object.getWorldPosition(new THREE.Vector3());
      flyTo(w.multiplyScalar(0.5).setY(0), 0.7);
    }
    openPanel(t.kind, t.id, from);
  }
  labels.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.lbl');
    if (!b) return;
    const t = targets.find((x) => x.kind === b.dataset.kind && x.id === b.dataset.id);
    if (t) activate(t, b);
  });
  // Keyboard focus on an off-screen label pans the view to it; the edge chips fly
  // between galaxies the same way. Target and camera move together, like a map.
  let focusPan: { from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; fromOff: THREE.Vector3; toOff: THREE.Vector3; arc: number } | null = null;
  let arriving: string | null = null;
  const productKinds = new Set<Kind>(['sdk', 'delivery', 'product', 'addproduct']);
  const scenarioKinds = new Set<Kind>(['scenario', 'scenekit']);
  /** Pan the view to `to`; `dist` also moves the camera in or out to that distance. */
  function flyTo(to: THREE.Vector3, dur = 1.4, dist?: number) {
    touched = true;
    controls.autoRotate = false;
    const fromOff = camera.position.clone().sub(controls.target);
    const toOff = dist ? fromOff.clone().setLength(dist) : fromOff.clone();
    if (reduced) {
      controls.target.copy(to);
      camera.position.copy(to).add(toOff);
      return;
    }
    // a long trip pulls back and up in the middle, then dives in; a short one just pans
    const trip = to.distanceTo(controls.target);
    const long = trip > 60;
    const high = Math.max(fromOff.length(), toOff.length()) > 400;
    focusPan = {
      from: controls.target.clone(), to: to.clone(), t: 0, fromOff, toOff,
      dur: long ? THREE.MathUtils.clamp(1.25 + trip / 320, 1.5, 2.5) : dur,
      arc: long ? Math.min(0.85, trip / 380) * (high ? 0.15 : 1) : 0,
    };
    root.classList.toggle('traveling', long);
  }
  function travelTo(id: string, instant = false) {
    const destination = id==='overview' ? {center:new THREE.Vector3(0,0,15)} : galaxyTags.find(g=>g.id===id);
    if (!destination) return;
    closePanel();
    const tall = root.clientWidth < root.clientHeight;
    const scenario = sg.systems.some((g) => g.id === id);
    // a scenario galaxy sits a little above the middle, clear of the task bar and the dock
    const at = scenario ? destination.center.clone().add(new THREE.Vector3(0, 0, tall ? -14 : 9)) : destination.center;
    flyTo(at, 1.4, id === 'overview' ? (tall ? 1350 : 930) : id === 'khp' ? new THREE.Vector3(...preset.position).length() : scenario ? (tall ? 138 : 84) : tall ? 105 : 102);
    arriving = instant ? null : id;
    if (instant && focusPan) {
      controls.target.copy(focusPan.to);
      camera.position.copy(focusPan.to).add(focusPan.toOff);
      focusPan = null;
      root.classList.remove('traveling');
      controls.update();
    }
    const url = new URL(location.href);
    root.querySelector<HTMLDetailsElement>('.scenario-atlas')?.removeAttribute('open');
    if (id === root.dataset.initialGalaxy) url.searchParams.delete('galaxy'); else url.searchParams.set('galaxy', id);
    history.replaceState(null, '', url);
  }
  // on arrival the galaxy introduces itself for a moment
  const arriveEl = root.querySelector<HTMLElement>('.arrive');
  let arriveTimer = 0;
  function arrive(id: string) {
    const g = data.scenarioGalaxies.find((g) => g.id === id);
    if (g) markGalaxy(g.id);
    if (!arriveEl || !g || id === root.dataset.initialGalaxy) return;
    arriveEl.style.setProperty('--signal', g.color);
    arriveEl.querySelector('.a-kind')!.textContent = `${data.lang === 'zh' ? '场景星系' : 'SCENARIO GALAXY'} · ${g.kits.map((k) => k.id).join(' → ')}`;
    arriveEl.querySelector('.a-name')!.textContent = g.name;
    arriveEl.querySelector('.a-sum')!.textContent = g.summary;
    arriveEl.hidden = false;
    arriveEl.classList.remove('show');
    void arriveEl.offsetWidth;
    arriveEl.classList.add('show');
    clearTimeout(arriveTimer);
    arriveTimer = window.setTimeout(() => (arriveEl.hidden = true), 4200);
  }
  // other parts of the page (task bar, search, tour) steer the map through this
  (window as unknown as { kuGoto?: (d: { galaxy?: string; planet?: string }) => boolean }).kuGoto = (d) => {
    if (d.planet && planets.has(d.planet)) {
      travelTo('khp');
      const t = targets.find((x) => x.kind === 'planet' && x.id === d.planet)!;
      openPanel('planet', d.planet, t.label);
      hovered = t;
      return true;
    }
    if (d.galaxy && (d.galaxy === 'overview' || galaxyTags.some((g) => g.id === d.galaxy))) {
      travelTo(d.galaxy);
      return true;
    }
    return false;
  };
  const galaxyLinks = [...root.querySelectorAll<HTMLAnchorElement>('[data-galaxy-go]')];
  let currentGalaxy = '';
  galaxyLinks.forEach(link=>link.addEventListener('click', e=>{
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); travelTo(link.dataset.galaxyGo!);
  }));
  labels.addEventListener('focusin', (e) => {
    const b = e.target as HTMLElement;
    if (!b.matches(':focus-visible')) return;
    const t = targets.find((x) => x.kind === b.dataset.kind && x.id === b.dataset.id);
    if (!t || t.kind === 'ship' || t.kind === 'galaxy') return;
    const w = t.object.getWorldPosition(new THREE.Vector3());
    // in the KHP galaxy lean towards the object; in the Product Galaxy centre on it
    const to = scenarioKinds.has(t.kind) ? w.lerp(sg.systems.find(g=>g.id===t.id.split(':')[0])!.center, 0.5).setY(0) : productKinds.has(t.kind) ? w.lerp(pg.center, 0.35).setY(0) : w.multiplyScalar(t.kind === 'planet' ? 0.55 : 0.4).setY(0);
    flyTo(to, to.distanceTo(controls.target) > 80 ? 1.4 : 0.6);
    hovered = t;
  });

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered: Target | null = null;
  let down: { x: number; y: number } | null = null;
  const hitList = () => targets.filter((t) => (!t.label.hidden || ['scenario','star','sdk'].includes(t.kind)) && t.object.visible && !(t.kind === 'blackhole' && !hole.visible)).flatMap((t) => t.hit);
  function pick(ev: PointerEvent): Target | null {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const found = raycaster.intersectObjects(hitList(), false).map((h) => targets.find((t) => t.hit.includes(h.object))!);
    // SDK rings have wide, invisible hit tubes: what sits on them wins the click
    if (found[0]?.kind === 'delivery') return found.find((t) => t.kind === 'product' || t.kind === 'addproduct' || t.kind === 'sdk') ?? found[0];
    return found[0] ?? null;
  }
  canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    const t = pick(e);
    if (t) activate(t, t.label);
    else closePanel();
  });
  let lastMove: PointerEvent | null = null;
  canvas.addEventListener('pointermove', (e) => (lastMove = e));
  canvas.addEventListener('pointerleave', () => {
    lastMove = null;
    hovered = null;
    canvas.style.cursor = '';
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const atlas=root.querySelector<HTMLDetailsElement>('.scenario-atlas[open]');
      if(atlas){atlas.open=false;atlas.querySelector('summary')?.focus();}
      if (landing) finishLanding();
      else closePanel();
    }
  });
  controls.listenToKeyEvents(window);

  // ── theme ─────────────────────────────────────────────────────────
  function applyTheme(next: Theme) {
    theme = next;
    pal = palette(theme);
    ambient.intensity = pal.ambient;
    hemi.intensity = theme === 'dark' ? 0.35 : 0.8;
    orbitMat.color.copy(pal.orbit);
    orbitMat.opacity = pal.orbitOpacity * .6;
    space.setTheme(theme);
    post.setTheme(theme);
    dustMat.uniforms.uOpacity.value = theme === 'dark' ? 0.85 : 0.5;
    dustMat.blending = theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
    dustMat.needsUpdate = true;
    (discGlow.material as THREE.MeshBasicMaterial).opacity = theme === 'dark' ? 0.16 : 0.12;
    data.planets.forEach((p) => {
      const o = planets.get(p.id)!;
      const c = theme === 'dark' ? p.color.dark : p.color.light;
      o.body.setTheme(theme);
      const am = o.atmo.material as THREE.ShaderMaterial;
      am.uniforms.uColor.value.set(c);
      am.uniforms.uStrength.value = theme === 'dark' ? 0.9 : 0.5;
      am.blending = pal.glowBlending;
      am.needsUpdate = true;
    });
    for (const g of [...starGlows, ...corona]) {
      g.material.blending = pal.glowBlending;
      g.material.needsUpdate = true;
    }
    for (const t of targets) if (t.kind === 'planet') t.label.style.setProperty('--kit', t.label.dataset[theme] || '');
    pg.setTheme(theme);
    sg.setTheme(theme);
  }
  window.addEventListener('ku:theme', (e) => applyTheme((e as CustomEvent).detail));
  if (theme === 'light') applyTheme('light');
  window.addEventListener('ku:visited', () => syncHole(true));
  window.addEventListener('storage', (e) => {
    if (e.key !== 'ku-visited') return;
    const v = new Set(visited());
    for (const [id, o] of planets) o.seen.visible = v.has(id);
    syncHole(true);
  });

  // ── sizing and visibility ─────────────────────────────────────────
  let sideShift = 0; // pixels the picture is pushed left while a side panel is open
  function resize() {
    const w = root.clientWidth;
    const h = root.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    post.setSize(w, h);
    camera.aspect = w / h;
    const next = presetFor(camera.aspect);
    if (next.id !== preset.id && !touched) {
      preset = next;
      camera.position.set(...preset.position);
      controls.target.set(0, 0, 0);
    }
    preset = touched ? preset : next;
    camera.fov = vfovFor(preset, camera.aspect);
    if (sideShift) camera.setViewOffset(w, h, sideShift, 0, w, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(root);
  resize();
  let onScreen = true;
  new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(root);

  const guard = new FrameGuard((level) => {
    if (level === 1) {
      renderer.setPixelRatio(1);
      post.setPixelRatio(1);
      post.setSize(root.clientWidth, root.clientHeight);
    } else if (level === 2) post.setEnabled(false);
  });
  // opening shot: the camera drifts in from a little further out
  const intro = reduced ? null : { t: 0, from: camera.position.clone().multiplyScalar(1.16), to: camera.position.clone() };
  if (intro) camera.position.copy(intro.from);

  // ── loop ──────────────────────────────────────────────────────────
  // frame delta from rAF timestamps (THREE.Clock is deprecated)
  let last = performance.now();
  const clock = { getDelta: () => { const now = performance.now(); const d = (now - last) / 1000; last = now; return d; } };
  const tmp = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  let first = true;
  let elapsed = 0;
  let skip = false;

  function frame() {
    requestAnimationFrame(frame);
    if (!onScreen || document.hidden) {
      clock.getDelta();
      return;
    }
    // at the lowest quality level, draw every other frame (about 30 fps)
    skip = guard.level >= 3 && !skip;
    if (skip) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsed += dt;
    guard.tick(dt);
    const motion = reduced ? 0 : 1;

    starUniforms.uTime.value = elapsed;
    gateUniforms.uTime.value = elapsed;
    holeUniforms.uTime.value = elapsed;
    newKitUniforms.uTime.value = elapsed * motion;
    starGlows.forEach((g, i) => ((g.material as THREE.SpriteMaterial).opacity = g.userData.base * (1 + Math.sin(elapsed * (1.3 + i)) * 0.06 * motion)));
    galaxy.rotation.y += dt * 0.012 * motion;
    corona[0].material.rotation += dt * 0.02 * motion;
    corona[1].material.rotation -= dt * 0.013 * motion;
    for (const fg of farGalaxies) fg.rotation.y += dt * 0.03 * motion;
    for (const s of stationSpin) s.rotation.z += dt * 0.25 * motion;
    for (const s of stationSpin) if (s.children.length > 2) s.rotation.y += dt * 0.2 * motion;
    for (const mw of marketWindows) {
      const shift = Math.floor(elapsed * 2.5 * (motion || 0.0001));
      for (let k = 0; k < mw.mesh.count; k++) mw.mesh.setColorAt(k, mw.colors[(k + shift) % mw.colors.length]);
      mw.mesh.instanceColor!.needsUpdate = true;
    }

    // hover from pointer
    if (lastMove && !landing) {
      const t = pick(lastMove);
      hovered = t;
      canvas.style.cursor = t ? 'pointer' : '';
      lastMove = null;
    }
    for (const [id, o] of planets) {
      o.mesh.rotation.y += dt * o.spin * (motion || 0.2);
      if (khpDetail.visible) o.body.update(dt, elapsed, motion, KHP_CENTER);
      const want = hovered?.kind === 'planet' && hovered.id === id ? 1 : 0;
      o.hover += (want - o.hover) * Math.min(1, dt * 10);
      o.group.scale.setScalar(1 + o.hover * 0.12);
      if (o.beacon) o.beacon.visible = Math.sin(elapsed * 4) > -0.2 || reduced;
    }

    khpDetail.visible=camera.position.distanceTo(KHP_CENTER)<300 && controls.target.distanceTo(KHP_CENTER)<100;
    khpFar.layers.set(khpDetail.visible ? 1 : 0);
    productsFar.layers.set(camera.position.distanceTo(pg.center) < 300 && controls.target.distanceTo(pg.center) < 100 ? 1 : 0);
    pg.update(dt, elapsed, motion, hovered, camera, controls.target);
    sg.update(dt, elapsed, motion, camera, controls.target, hovered);


    // ships
    ships.forEach((s, k) => {
      if (reduced) {
        if (s.phase === 'fly') {
          s.g.position.copy(s.curve.getPoint(1));
          s.phase = 'land';
        }
      } else if (s.phase === 'fly') {
        s.t += dt / s.dur;
        const u = ease.inOut(Math.min(1, s.t));
        s.curve.getPoint(u, s.g.position);
        s.curve.getPoint(Math.min(1, u + 0.01), tmp);
        if (tmp.distanceToSquared(s.g.position) > 1e-6) s.g.lookAt(tmp.applyMatrix4(galaxy.matrixWorld));
        if (s.t >= 1) {
          s.phase = 'land';
          s.wait = 1.8 + sr() * 1.5;
        }
      } else {
        s.wait -= dt;
        s.g.position.y = s.curve.v2.y + Math.sin(elapsed * 3 + k) * 0.08;
        if (s.wait <= 0) {
          let next = ids[Math.floor(sr() * ids.length)];
          if (next === s.to) next = ids[(ids.indexOf(next) + 1 + Math.floor(sr() * 5)) % ids.length];
          s.curve = flight(s.g.position, next);
          s.to = next;
          s.t = 0;
          s.dur = 6 + sr() * 5;
          s.phase = 'fly';
          const p = planets.get(next)!.p;
          const lbl = shipTarget(k).label;
          lbl.setAttribute('aria-label', `${S['scene.ship']}: ${p.ship}`);
          (s.engine.material as THREE.SpriteMaterial).color.set(p.color.dark);
          ((s.trail.material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color).set(p.color.dark);
          if (openShip === k) panelTitle.textContent = p.ship;
        }
      }
      // trail follows in galaxy-local space
      const tp = s.trailPts;
      tp.copyWithin(3, 0, tp.length - 3);
      tp[0] = s.g.position.x;
      tp[1] = s.g.position.y;
      tp[2] = s.g.position.z;
      (s.trail.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    });

    // camera motion: landing tween, keyboard focus pan
    if (landing) {
      landing.t += dt / WARP;
      const u = ease.in(Math.min(1, landing.t));
      camera.position.lerpVectors(landing.from, landing.to, u);
      controls.target.lerpVectors(landing.fromTarget, landing.toTarget, ease.out(Math.min(1, landing.t * 1.4)));
      camera.fov = vfovFor(preset, camera.aspect) + u * 38;
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      if (landing.t >= 1) finishLanding();
    } else {
      if (focusPan) {
        focusPan.t += dt / focusPan.dur;
        const u = ease.inOut(Math.min(1, focusPan.t));
        controls.target.lerpVectors(focusPan.from, focusPan.to, u);
        tmp.lerpVectors(focusPan.fromOff, focusPan.toOff, u);
        if (focusPan.arc) {
          const lift = Math.sin(Math.PI * u) * focusPan.arc;
          const len = tmp.length();
          tmp.multiplyScalar(1 + lift);
          tmp.y += len * lift * 0.35;
        }
        camera.position.copy(controls.target).add(tmp);
        if (focusPan.t >= 1) {
          focusPan = null;
          root.classList.remove('traveling');
          if (arriving) arrive(arriving);
          arriving = null;
        }
      }
      if (intro && intro.t < 1 && !touched) {
        intro.t = Math.min(1, intro.t + dt / 2.6);
        camera.position.lerpVectors(intro.from, intro.to, ease.out(intro.t));
      }
      controls.update(dt);
      // Stay on the navigation plane, with no horizontal boundary.
      tmp.set(0, -controls.target.y, 0);
      if (tmp.lengthSq() > 0) {
        controls.target.add(tmp);
        camera.position.add(tmp);
      }
    }
    // the headline belongs to the KHP galaxy: it steps aside when you travel
    const overview = camera.position.distanceTo(controls.target)>400;
    root.classList.toggle('overview',overview);
    root.classList.toggle('away', overview || controls.target.lengthSq() > 45 * 45);
    updateLinks(dt, overview);
    const nearest = overview ? 'overview' : galaxyTags.reduce((a,b)=>controls.target.distanceToSquared(a.center)<controls.target.distanceToSquared(b.center)?a:b).id;
    if (nearest !== currentGalaxy) {
      currentGalaxy = nearest;
      root.dataset.currentGalaxy = nearest;
      root.classList.toggle('intro-hidden',nearest!==root.dataset.initialGalaxy);
      galaxyLinks.forEach(link=>link.setAttribute('aria-current',String(link.dataset.galaxyGo===nearest)));
      const selected=data.scenarioGalaxies.find(g=>g.id===nearest);
      const heading=root.querySelector<HTMLElement>('[data-atlas-current]');
      if(heading) heading.textContent=selected?.name || (data.lang==='zh'?'场景':'Scenarios');
    }
    space.update(camera, controls.target, elapsed, motion);

    // a panel on the right pushes the picture left, so what you clicked stays in view
    const wantShift = W() > 900 && (!panel.hidden || document.documentElement.classList.contains('replaying')) ? Math.min(230, W() * 0.16) : 0;
    if (Math.abs(wantShift - sideShift) > 0.5) {
      sideShift = reduced ? wantShift : sideShift + (wantShift - sideShift) * Math.min(1, dt * 6);
      if (sideShift < 1 && !wantShift) {
        sideShift = 0;
        camera.clearViewOffset();
      } else camera.setViewOffset(W(), H(), sideShift, 0, W(), H());
    }

    post.render();
    placeLabels();

    if (first) {
      first = false;
      root.classList.add('live');
      root.querySelector('.poster-wrap')?.setAttribute('inert', '');
      root.querySelector('.poster-wrap')?.setAttribute('aria-hidden', 'true');
    }
  }

  // A small card beside what the pointer is on: the kit's own picture and what the agent was asked.
  const hoverCard = root.querySelector<HTMLElement>('.hover-card');
  let hoverKey = '';
  function placeHoverCard(t: Target | null, at: { x: number; y: number } | null) {
    if (!hoverCard) return;
    let info: { thumb: string; goal: string } | undefined;
    if (t?.kind === 'planet') info = planets.get(t.id)?.p.replay;
    else if (t?.kind === 'scenekit') {
      const [gid, kid] = t.id.split(':');
      info = data.scenarioGalaxies.find((g) => g.id === gid)?.kits.find((k) => k.id === kid)?.replay;
    }
    const open = !!(t && at && info && panel.hidden && W() > 700);
    hoverCard.classList.toggle('show', open);
    if (!open) return;
    const key = `${t!.kind}:${t!.id}`;
    if (key !== hoverKey) {
      hoverKey = key;
      hoverCard.querySelector<HTMLImageElement>('img')!.src = info!.thumb;
      hoverCard.querySelector('.h-goal')!.textContent = info!.goal;
    }
    const left = at!.x + 150 > W() - 130;
    hoverCard.style.transform = `translate3d(${(at!.x + (left ? -150 : 150)).toFixed(1)}px, ${Math.min(H() - 190, Math.max(80, at!.y - 70)).toFixed(1)}px, 0) translate(-50%, 0)`;
  }

  // HTML labels follow their objects; off-screen ones fade but stay focusable.
  const H = () => root.clientHeight;
  const W = () => root.clientWidth;
  function placeLabels() {
    camera.getWorldDirection(camDir);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    for (const c of clusterTags) {
      c.o.getWorldPosition(tmp);
      const behind = tmp.clone().sub(camera.position).dot(camDir) < 0;
      tmp.project(camera);
      // keep the whole tag on screen (narrow phones)
      const half = (c.el.dataset.w ? Number(c.el.dataset.w) : (c.el.dataset.w = String(c.el.offsetWidth), c.el.offsetWidth)) / 2 + 4;
      const rawX = (tmp.x * 0.5 + 0.5) * W();
      const cx = Math.min(W() - half, Math.max(half, rawX));
      c.el.style.transform = `translate3d(${cx.toFixed(1)}px, ${((-tmp.y * 0.5 + 0.5) * H()).toFixed(1)}px, 0) translate(-50%, -50%)`;
      // nudged back on screen only when it is just over the edge, not when the cluster is far away
      c.el.style.opacity = !khpDetail.visible || behind || Math.abs(rawX - cx) > half ? '0' : '';
    }
    const galaxyRects: {x:number;y:number;half:number}[]=[];
    for (const g of galaxyTags) {
      tmp.copy(g.at);
      const behind = tmp.clone().sub(camera.position).dot(camDir) < 0;
      tmp.project(camera);
      const away = controls.target.distanceTo(g.center);
      // the KHP name only shows from afar (the headline names it at home)
      const o = behind || (away<75 && camera.position.distanceTo(controls.target)<400) ? 0 : 1;
      // keep a name that is just over the edge on screen (narrow phones)
      const half = (g.el.dataset.w ? Number(g.el.dataset.w) : (g.el.dataset.w = String(g.el.offsetWidth), g.el.offsetWidth)) / 2 + 8;
      const rawX = (tmp.x * 0.5 + 0.5) * W();
      const gx = Math.min(W() - half, Math.max(half, rawX));
      const baseY=(-tmp.y*.5+.5)*H();
      let gy=baseY;
      if(camera.position.distanceTo(controls.target)>400 && o) {
        for(const shift of [0,-20,20,-40,40,-60,60]) {
          const y=baseY+shift;
          if(!galaxyRects.some(r=>Math.abs(r.x-gx)<r.half+half && Math.abs(r.y-y)<22)){gy=y;break;}
        }
        galaxyRects.push({x:gx,y:gy,half});
      }
      g.el.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      g.el.style.opacity = Math.abs(rawX - gx) > half * 2 || gy<10 || gy>H()-40 ? '0' : String(o);
      g.el.style.pointerEvents = g.el.style.opacity==='0'?'none':'auto';
      g.el.tabIndex = g.el.style.opacity==='0'?-1:0;
    }
    const crowd: { x: number; y: number; w: number; h: number }[] = [];
    for (const t of targets) {
      if (scenarioKinds.has(t.kind) && t.label.hidden) continue;
      if (!scenarioKinds.has(t.kind)) {
        const center=productKinds.has(t.kind)?pg.center:KHP_CENTER;
        t.label.hidden=camera.position.distanceTo(center)>300 || controls.target.distanceTo(center)>100;
        if(t.label.hidden) continue;
      }
      t.object.getWorldPosition(tmp);
      const dist = tmp.distanceTo(camera.position);
      const behind = tmp.clone().sub(camera.position).dot(camDir) < 0;
      const pxR = (t.radius * H()) / 2 / (dist * tanHalf);
      tmp.project(camera);
      const rawX = (tmp.x * 0.5 + 0.5) * W();
      const labelHalf = scenarioKinds.has(t.kind) ? t.label.offsetWidth / 2 + 8 : 0;
      const x = labelHalf ? Math.min(W() - labelHalf, Math.max(labelHalf, rawX)) : rawX;
      let y = (-tmp.y * 0.5 + 0.5) * H() + pxR * t.labelOffset * (t.kind === 'planet' ? 1 + (planets.get(t.id)?.hover ?? 0) * 0.12 : 1);
      if (t.kind === 'station' || t.kind === 'newkit' || t.kind === 'blackhole') {
        const w = t.label.dataset.w ? Number(t.label.dataset.w) : t.label.offsetWidth;
        const h = t.label.dataset.h ? Number(t.label.dataset.h) : t.label.offsetHeight;
        for (let n = 0; n < 4 && crowd.some((r) => Math.abs(r.x - x) < (r.w + w) / 2 + 8 && Math.abs(r.y - y) < (r.h + h) / 2 + 2); n++) y += h + 4;
        crowd.push({ x, y, w, h });
      }
      const off = behind || rawX < -40 || rawX > W() + 40 || y < -40 || y > H() + 40;
      const s = t.label.style;
      s.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${t.kind === 'ship' ? '-50%' : '0'})`;
      const far = t.kind === 'planet' || productKinds.has(t.kind) || scenarioKinds.has(t.kind) || t.kind === 'newkit' ? THREE.MathUtils.clamp(1.25 - dist / 190, 0.35, 1) : 1;
      s.opacity = off ? '0' : String(far);
      t.label.classList.toggle('hot', hovered === t);
      if (hovered === t) placeHoverCard(t, off ? null : { x, y });
      t.label.classList.toggle('compact', t.kind === 'planet' && pxR < 9);
    }
    if (!hovered || hovered.label.hidden) placeHoverCard(null, null);
    // chips go last and slide along the edge until they clear every visible label
    const taken: { l: number; t: number; r: number; b: number }[] = [];
    const dock = root.querySelector<HTMLElement>('.galaxy-nav');
    if (dock) taken.push({l:dock.offsetLeft-dock.offsetWidth/2-8,t:dock.offsetTop-8,r:dock.offsetLeft+dock.offsetWidth/2+8,b:dock.offsetTop+dock.offsetHeight+8});
    for (const t of targets) {
      if (t.label.hidden || t.label.style.opacity === '0' || t.label.style.pointerEvents === 'none') continue;
      const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(t.label.style.transform);
      if (!m) continue;
      const w = t.label.dataset.w ? Number(t.label.dataset.w) : Number((t.label.dataset.w = String(t.label.offsetWidth)));
      const h = t.label.dataset.h ? Number(t.label.dataset.h) : Number((t.label.dataset.h = String(t.label.offsetHeight)));
      const lx = Number(m[1]);
      const ly = Number(m[2]) - (t.kind === 'ship' ? h / 2 : 0);
      taken.push({ l: lx - w / 2, t: ly, r: lx + w / 2, b: ly + h });
    }
    const nearestChips=new Set([...edgeChips].sort((a,b)=>controls.target.distanceToSquared(a.center)-controls.target.distanceToSquared(b.center)).slice(0,3).map(c=>c.id));
    for (const c of edgeChips) {
      tmp.copy(c.center);
      const behind = tmp.clone().sub(camera.position).dot(camDir) < 0;
      tmp.project(camera);
      let x = tmp.x;
      let y = tmp.y;
      if (behind) {
        x = -x;
        y = -y;
      }
      const onScreen = !behind && Math.abs(x) < 0.85 && Math.abs(y) < 0.85;
      const show = nearestChips.has(c.id) && camera.position.distanceTo(controls.target)<400 && root.clientWidth>700 && !onScreen && controls.target.distanceTo(c.center) > 70 && !landing;
      c.b.hidden = !show;
      if (!show) continue;
      // put the chip where the line from the screen centre to the galaxy leaves the screen
      const px = x * W() * 0.5;
      const py = -y * H() * 0.5;
      const k = Math.min((W() * 0.5 - 90) / Math.max(1e-3, Math.abs(px)), (H() * 0.5 - 70) / Math.max(1e-3, Math.abs(py)));
      const ex = W() * 0.5 + px * k;
      // keep clear of the hint line and the labels along the bottom edge
      const ey = Math.min(H() - 110, H() * 0.5 + py * k);
      const cw = (c.b.dataset.w ? Number(c.b.dataset.w) : Number((c.b.dataset.w = String(c.b.offsetWidth)))) / 2 + 6;
      const ch = 24;
      const along = Math.abs(px) * (H() / W()) > Math.abs(py); // on a side edge: slide vertically, else horizontally
      let fx = ex;
      let fy = ey;
      // along the edge first, then step in from it
      const inward = { x: along ? -Math.sign(px) : 0, y: along ? 0 : -Math.sign(py) };
      search: for (const step of [0, 1, 2, 3])
        for (const d of [0, -44, 44, -88, 88, -132, 132, -176, 176]) {
          const tx = Math.min(W() - cw, Math.max(cw, ex + (along ? 0 : d * 1.6) + inward.x * step * 70));
          const ty = Math.min(H() - 110, Math.max(70, ey + (along ? d : 0) + inward.y * step * 48));
          if (!taken.some((r) => r.l < tx + cw && tx - cw < r.r && r.t < ty + ch && ty - ch < r.b)) {
            fx = tx;
            fy = ty;
            break search;
          }
        }
      c.b.style.transform = `translate3d(${fx.toFixed(1)}px, ${fy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      c.b.style.setProperty('--angle', `${Math.atan2(py, px).toFixed(3)}rad`);
      taken.push({l:fx-cw,t:fy-ch,r:fx+cw,b:fy+ch});
    }
  }

  // compile shaders without blocking the main thread, then start drawing
  await yieldToMain();
  await renderer.compileAsync(scene, camera).catch(() => undefined);
  await uploadTextures(renderer, scene);
  const params=new URLSearchParams(location.search);
  let requestedGalaxy=params.get('galaxy') || root.dataset.initialGalaxy || 'khp';
  if(location.pathname.endsWith('/missions/') && params.has('mission')) requestedGalaxy='missions';
  if(requestedGalaxy==='missions') requestedGalaxy=legacyScenario(params.get('mission'));
  if(requestedGalaxy==='overview'||galaxyTags.some(g=>g.id===requestedGalaxy)) travelTo(requestedGalaxy,true);
  requestAnimationFrame(frame);

  return { land };
}

/** Scaffolding lattice around a Preview planet; cad also gets a tower crane. */
function scaffold(R: number, mat: THREE.LineBasicMaterial, crane: boolean): THREE.LineSegments {
  const v: number[] = [];
  const poles = 10;
  const r = R * 1.16;
  const y0 = -R * 0.55;
  const y1 = R * 0.95;
  const arc = Math.PI * 1.25; // only part of the way round: it is not finished
  for (let i = 0; i <= poles; i++) {
    const a = -arc / 2 + (i / poles) * arc;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    v.push(x, y0, z, x, y1, z);
    if (i < poles) {
      const a2 = -arc / 2 + ((i + 1) / poles) * arc;
      const x2 = Math.cos(a2) * r;
      const z2 = Math.sin(a2) * r;
      for (const y of [y0 + (y1 - y0) * 0.33, y0 + (y1 - y0) * 0.66, y1]) v.push(x, y, z, x2, y, z2);
      v.push(x, y0, z, x2, y0 + (y1 - y0) * 0.33, z2);
    }
  }
  if (crane) {
    const base = new THREE.Vector3(0, R * 0.9, 0);
    const top = base.clone().add(new THREE.Vector3(0, R * 1.3, 0));
    v.push(base.x, base.y, base.z, top.x, top.y, top.z);
    v.push(top.x - R * 0.6, top.y, top.z, top.x + R * 1.6, top.y, top.z);
    v.push(top.x, top.y + R * 0.3, top.z, top.x + R * 1.6, top.y, top.z);
    v.push(top.x, top.y + R * 0.3, top.z, top.x - R * 0.6, top.y, top.z);
    v.push(top.x + R * 1.2, top.y, top.z, top.x + R * 1.2, top.y - R * 0.7, top.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return new THREE.LineSegments(g, mat);
}
