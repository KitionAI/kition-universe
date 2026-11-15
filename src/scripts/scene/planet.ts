// Planet page scene: a night-time city on the planet's north pole. The
// planet's signature landmark (signature.ts) stands on the pole; around it,
// each landmark is one thing the kit really does (data/universe.yaml →
// capabilities), with lit blocks, neon ring roads with traffic, a landing pad
// with agent ships, and scaffolding on Preview planets. Above the city float
// holograms of what you can make with the kit (data/scenarios.yaml).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { reducedMotion } from './support';
import { bloom } from './post';
import {
  atmosphere,
  cityLightsTexture,
  coronaTexture,
  currentTheme,
  ease,
  FrameGuard,
  uploadTextures,
  yieldToMain,
  glowTexture,
  initialPixelRatio,
  nebulaTexture,
  planetTexture,
  rng,
  shade,
  skyTexture,
  starfield,
  type Theme,
} from './common';
import type { PlanetSceneData } from './types';
import { signature } from './signature';
import { scenarioCanvas } from './scenarioArt';

const R = 20; // planet radius in this scene
const UP = new THREE.Vector3(0, 1, 0);
const ROADS = [0.13, 0.27, 0.41];
const SPOKES = Array.from({ length: 12 }, (_, k) => (k / 12) * Math.PI * 2 + 0.13);
const SIG_SCALE = 0.62;

// each planet builds in its own materials, so the cities differ beyond the landmark
type Style = { dark: string; light: string; glass: string };
const STYLES: Record<string, Style> = {
  stone: { dark: '#d6c9b0', light: '#f4ecde', glass: '#a9c8e8' },
  glass: { dark: '#8a90b8', light: '#dcdff4', glass: '#8fe3ff' },
  brick: { dark: '#c8927c', light: '#f2d6ca', glass: '#ffd9a8' },
  steel: { dark: '#aeb7c8', light: '#e6eaf2', glass: '#b9e0ff' },
};
const PLANET_STYLE: Record<string, keyof typeof STYLES> = {
  note: 'stone', doc: 'stone', sheet: 'stone', pdf: 'stone',
  photo: 'glass', vector: 'glass', layout: 'glass', motion: 'glass',
  film: 'brick', slide: 'brick', board: 'brick',
  table: 'steel', cad: 'steel',
};

/** The kit colour with its saturation scaled and its lightness set. */
function mute(hex: string, sat: number, light: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * sat, light);
  return `#${c.getHexString()}`;
}

export async function mountPlanet(root: HTMLElement, data: PlanetSceneData) {
  const reduced = reducedMotion();
  const P = data.planet;
  let theme: Theme = currentTheme();
  const kitColor = () => (theme === 'dark' ? P.color.dark : P.color.light);
  // the ground is a muted, darker kit colour: the landmark, roads and lights carry the colour
  const groundColor = () => (theme === 'dark' ? mute(kitColor(), 0.4, 0.27) : mute(kitColor(), 0.38, 0.7));
  const style = STYLES[PLANET_STYLE[P.id] ?? 'steel'];
  const wallColor = () => (theme === 'dark' ? style.dark : style.light);
  const fogColor = () => (theme === 'dark' ? '#10112c' : '#e2dbfa');
  const seedBase = [...P.id].reduce((a, c) => a + c.charCodeAt(0), 0);

  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  root.querySelector('.scene-layer')!.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: initialPixelRatio() < 1.5, alpha: false });
  renderer.setPixelRatio(initialPixelRatio());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = initialPixelRatio() >= 1.5;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = skyTexture(theme);
  // haze towards the horizon; near and far follow the camera distance every frame
  scene.fog = new THREE.Fog(fogColor(), 24, 70);
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 2000);
  const TARGET = new THREE.Vector3(0, R + 0.4, 0);
  const REST = new THREE.Vector3(0, R + 9, 21);
  camera.position.copy(REST);
  const post = bloom(renderer, scene, camera, theme);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 9;
  controls.maxDistance = 48;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.36;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.3;
  controls.addEventListener('start', () => (controls.autoRotate = false));
  controls.update();

  // ── light ─────────────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0xffffff, theme === 'dark' ? 0.25 : 0.9);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xb9c6ff, new THREE.Color(kitColor()), theme === 'dark' ? 0.45 : 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, theme === 'dark' ? 1.1 : 2.2);
  sun.position.set(40, R + 30, -30);
  sun.target.position.copy(TARGET);
  sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 10, far: 110 });
  scene.add(sun, sun.target);

  // ── sky: stars, nebulae, the KHP star, a neighbour planet ─────────
  const stars = starfield(innerWidth < 700 ? 1200 : 2200, 400, 900, seedBase);
  scene.add(stars);
  const nebulae = (
    [
      [[-420, R + 160, -620], [130, 90, 255], 900],
      [[460, R + 60, -700], [255, 90, 170], 820],
      [[60, R + 320, -760], [80, 170, 255], 900],
    ] as [[number, number, number], [number, number, number], number][]
  ).map(([p, c, s], i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebulaTexture(c, seedBase + i * 9), transparent: true, depthWrite: false, opacity: theme === 'dark' ? 0.6 : 0.3, blending: theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending }));
    sp.position.set(...p);
    sp.scale.setScalar(s);
    scene.add(sp);
    return sp;
  });
  const khpPos = new THREE.Vector3(260, R + 150, -520);
  const khpCore = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
  khpCore.position.copy(khpPos);
  scene.add(khpCore);
  const khpGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,170,70,1)', 'rgba(255,170,70,0)'), transparent: true, depthWrite: false, opacity: 0.8, blending: THREE.AdditiveBlending }));
  khpGlow.position.copy(khpPos);
  khpGlow.scale.setScalar(150);
  scene.add(khpGlow);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaTexture(), transparent: true, depthWrite: false, opacity: 0.55, blending: THREE.AdditiveBlending }));
  corona.position.copy(khpPos);
  corona.scale.setScalar(150);
  scene.add(corona);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(14, 40, 28),
    new THREE.MeshStandardMaterial({ map: planetTexture('craters', shade(kitColor(), 0.15), seedBase + 3), roughness: 0.9 }),
  );
  moon.position.set(-230, R + 70, -420);
  scene.add(moon);
  moon.add(atmosphere(15, kitColor(), 0.8));
  for (const o of [stars, ...nebulae, khpCore, khpGlow, corona, moon]) ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).fog = false;

  await yieldToMain();
  // ── the planet ────────────────────────────────────────────────────
  const planetMat = new THREE.MeshStandardMaterial({
    map: planetTexture(P.surface.style, groundColor(), seedBase, 1024),
    roughness: 0.92,
    metalness: 0.02,
    emissive: new THREE.Color('#ffd9a0'),
    emissiveMap: cityLightsTexture(seedBase, 1024),
    emissiveIntensity: theme === 'dark' ? 0.6 : 0.1,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 120), planetMat);
  planet.receiveShadow = true;
  scene.add(planet);
  const atmo = atmosphere(R * 1.035, kitColor(), theme === 'dark' ? 0.7 : 0.5);
  scene.add(atmo);

  if (P.surface.ring) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(R * 1.8, R * 2.9, 200, 1), ringBands(P.color.dark, R * 1.8, R * 1.1));
    ring.rotation.set(-Math.PI / 2 + 0.28, 0, 0.18);
    scene.add(ring);
  }

  const onSurface = (theta: number, phi: number, lift = 0) => {
    const n = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    return { n, p: n.clone().multiplyScalar(R + lift) };
  };

  // ring roads glow in the kit colour, with headlights running along them
  const roadMat = new THREE.LineBasicMaterial({ color: kitColor(), transparent: true, opacity: 0.85 });
  for (const phi of ROADS) {
    const pts = Array.from({ length: 181 }, (_, k) => onSurface((k / 180) * Math.PI * 2, phi, 0.04).p);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), roadMat));
  }
  for (const th of SPOKES) {
    const pts = Array.from({ length: 24 }, (_, i) => onSurface(th, 0.13 + (i / 23) * 0.35, 0.04).p);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), roadMat));
  }
  const CARS = 90;
  const cars = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: '#fff3c8' }), CARS);
  const carState = Array.from({ length: CARS }, (_, i) => ({ road: ROADS[i % 3], th: (i / CARS) * Math.PI * 2 * 3, v: (0.04 + (i % 5) * 0.012) * (i % 2 ? 1 : -1) }));
  scene.add(cars);

  await yieldToMain();
  // ── buildings ─────────────────────────────────────────────────────
  const windowTex = windowTexture(seedBase);
  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor(),
    roughness: 0.55,
    metalness: 0.15,
    emissive: new THREE.Color('#ffd79a'),
    emissiveMap: windowTex,
    emissiveIntensity: theme === 'dark' ? 1.5 : 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({ color: kitColor(), roughness: 0.4, metalness: 0.3, emissive: new THREE.Color(kitColor()), emissiveIntensity: theme === 'dark' ? 0.55 : 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({ color: style.glass, roughness: 0.1, metalness: 0.7, emissive: new THREE.Color(style.glass), emissiveMap: windowTex, emissiveIntensity: theme === 'dark' ? 1.2 : 0.3 });
  const lightMat = new THREE.MeshBasicMaterial({ color: '#fff1b0' });
  const screenTex = makeScreenTexture(P.name);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });

  interface Landmark {
    id: string;
    group: THREE.Group;
    top: THREE.Object3D;
    label: HTMLButtonElement;
    hover: number;
    /** the label sits over the signature landmark */
    behind: boolean;
    /** 0..1: an agent replay is running commands of this capability */
    work: number;
    spark: THREE.Sprite;
    pool: THREE.MeshBasicMaterial;
    poolColor: THREE.Color;
  }
  const WORK = new THREE.Color('#ffcf7a');
  const landmarks: Landmark[] = [];
  const hitMeshes = new Map<THREE.Object3D, Landmark | Holo>();
  const labels = root.querySelector<HTMLElement>('.scene-labels')!;
  const n = data.buildings.length;
  const SCALE = 0.62;

  data.buildings.forEach((b, i) => {
    const theta = (i / n) * Math.PI * 2 + 0.9;
    const phi = 0.2 + (i % 2) * 0.12;
    const { n: normal, p } = onSurface(theta, phi);
    const g = new THREE.Group();
    g.position.copy(p);
    g.quaternion.setFromUnitVectors(UP, normal);
    g.rotateY(-theta + Math.PI / 2);
    g.scale.setScalar(SCALE);
    const { mesh, height } = landmark(b.shape, { wallMat, accentMat, glassMat, lightMat, screenMat }, seedBase + i);
    g.add(mesh);
    mesh.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // a soft pool of kit-coloured light at the foot of every landmark
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 32),
      new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,255,255,1)'), color: kitColor(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.05;
    g.add(pool);
    if (P.surface.scaffold && i % 2 === 0) g.add(scaffoldBox(2.6, height * 1.15));
    const top = new THREE.Object3D();
    top.position.y = height + 0.8;
    g.add(top);
    scene.add(g);
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'lbl lbl-building';
    label.innerHTML = `<span class="n">${b.name}</span><span class="k">${b.title}</span>`;
    label.setAttribute('aria-label', `${b.name}: ${b.title}`);
    label.dataset.id = b.id;
    labels.appendChild(label);
    // a spark over the roof while an agent's commands are using this capability
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,1)'), color: '#ffcf7a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    spark.scale.setScalar(4.2);
    spark.position.y = height + 0.6;
    spark.visible = false;
    g.add(spark);
    const poolMat = pool.material as THREE.MeshBasicMaterial;
    const lm = { id: b.id, group: g, top, label, hover: 0, behind: false, work: 0, spark, pool: poolMat, poolColor: poolMat.color.clone() };
    landmarks.push(lm);
    mesh.traverse((o) => (o as THREE.Mesh).isMesh && hitMeshes.set(o, lm));
  });

  // the signature landmark on the pole, inside the first ring road
  const hues = () => ({ main: kitColor(), light: shade(kitColor(), 0.25), dark: shade(kitColor(), -0.3) });
  const sig = signature(P.id, hues(), { wall: wallMat, glass: glassMat }, theme, seedBase);
  sig.group.position.set(0, R - 0.05, 0);
  sig.group.scale.setScalar(SIG_SCALE);
  sig.group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(sig.group);
  const POLE = new THREE.Vector3(0, R, 0);
  const sigReach = sig.radius * SIG_SCALE + 0.35;
  // solid parts only: light beams and sprites should not hide labels
  const sigSolids: THREE.Object3D[] = [];
  sig.group.traverse((o) => (o as THREE.Mesh).isMesh && !((o as THREE.Mesh).material as THREE.Material).transparent && sigSolids.push(o));
  const sigRay = new THREE.Raycaster();

  // the landing pad sits in the gap between two landmarks, front right of the pole
  const gaps = Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * Math.PI * 2 + 0.9);
  const angleTo = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const padTheta = gaps.reduce((best, g) => (angleTo(g, Math.PI / 2 - 0.8) < angleTo(best, Math.PI / 2 - 0.8) ? g : best));
  const padSpot = onSurface(padTheta, 0.2);
  const padG = new THREE.Group();
  padG.position.copy(padSpot.p);
  padG.quaternion.setFromUnitVectors(UP, padSpot.n);
  scene.add(padG);

  // blocks lining the streets: dense and tall near the pole, thinning out towards the horizon.
  // Four window-grid heights keep the windows the same size on short and tall blocks.
  const r = rng(seedBase * 7);
  const FILL = innerWidth < 700 ? 80 : 150;
  const fillerMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.6,
    metalness: 0.1,
    emissive: new THREE.Color('#ffd79a'),
    emissiveMap: blockWindowTexture(seedBase),
    emissiveIntensity: theme === 'dark' ? 1.15 : 0.25,
  });
  const ROWS = [1, 2, 3, 5];
  const fillers = ROWS.map((rows) => {
    const m = new THREE.InstancedMesh(windowedBox(rows), fillerMat, FILL);
    m.castShadow = m.receiveShadow = true;
    m.count = 0;
    scene.add(m);
    return m;
  });
  const m4 = new THREE.Matrix4();
  const tints = () => [wallColor(), shade(wallColor(), -0.08), shade(wallColor(), 0.06), theme === 'dark' ? mute(kitColor(), 0.5, 0.62) : mute(kitColor(), 0.4, 0.82)];
  const blockTint: number[][] = ROWS.map(() => []);
  const spots: THREE.Vector3[] = [];
  for (let tries = 0; spots.length < FILL && tries < FILL * 14; tries++) {
    let theta: number;
    let phi: number;
    const side = r() < 0.5 ? -1 : 1;
    if (r() < 0.62) {
      // beside a ring road
      const road = ROADS[Math.floor(r() * ROADS.length)];
      theta = r() * Math.PI * 2;
      phi = road + side * (0.019 + r() * 0.012);
    } else {
      // beside a spoke
      phi = 0.16 + r() * 0.32;
      theta = SPOKES[Math.floor(r() * SPOKES.length)] + (side * (0.02 + r() * 0.012)) / Math.sin(phi);
    }
    if (r() > 1.3 - phi / 0.4) continue;
    const { n: normal, p } = onSurface(theta, phi);
    if (landmarks.some((l) => l.group.position.distanceTo(p) < 2.2)) continue;
    if (p.distanceTo(POLE) < sigReach || p.distanceTo(padSpot.p) < 1.6) continue;
    if (SPOKES.some((sp) => angleTo(sp, theta) * Math.sin(phi) * R < 0.34)) continue;
    if (spots.some((q) => q.distanceTo(p) < 0.5)) continue;
    const centre = Math.max(0, 1 - phi / 0.5);
    const tower = r() < 0.07 ? 1.9 : 1;
    const h = (0.22 + Math.pow(centre, 1.5) * 1.45) * (0.55 + r() * 0.9) * tower;
    const w = 0.28 + r() * 0.2;
    const d = w * (0.8 + r() * 0.5);
    const k = h / w < 1.2 ? 0 : h / w < 2.4 ? 1 : h / w < 4 ? 2 : 3;
    // square to the street, like the landmarks
    const q = new THREE.Quaternion().setFromUnitVectors(UP, normal).multiply(new THREE.Quaternion().setFromAxisAngle(UP, -theta + Math.PI / 2));
    m4.compose(p.clone().add(normal.clone().multiplyScalar(h / 2 - 0.03)), q, new THREE.Vector3(w, h, d));
    const mesh = fillers[k];
    const tint = Math.floor(r() * 4);
    mesh.setMatrixAt(mesh.count, m4);
    mesh.setColorAt(mesh.count, new THREE.Color(tints()[tint]));
    blockTint[k].push(tint);
    mesh.count++;
    spots.push(p);
  }

  // landing pad + agent ships
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.08, 40), new THREE.MeshStandardMaterial({ color: '#1d1f35', roughness: 0.5 }));
  pad.position.set(0, 0.04, 0);
  padG.add(pad);
  const padRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.88, 48), new THREE.MeshBasicMaterial({ color: kitColor(), side: THREE.DoubleSide }));
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(0, 0.09, 0);
  padG.add(padRing);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.9, 3.2, 32, 1, true),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(kitColor()) }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
        void main(){ float a = pow(1.0 - vUv.y, 2.0) * 0.3 * (0.75 + 0.25*sin(vUv.y*30.0 - uTime*4.0)); gl_FragColor = vec4(uColor, a); }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  beam.position.set(0, 1.6, 0);
  padG.add(beam);

  const shipMat = new THREE.MeshStandardMaterial({ color: '#f4f2ff', roughness: 0.3, metalness: 0.5, emissive: new THREE.Color(kitColor()), emissiveIntensity: 0.25 });
  const ships = [0, 1].map((k) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 10), shipMat);
    g.add(body);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.28), shipMat);
    wing.position.y = -0.18;
    g.add(wing);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,1)'), color: '#9ad7ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flame.position.y = -0.6;
    flame.scale.setScalar(0.9);
    g.add(flame);
    padG.add(g);
    return { g, t: k * 0.5, flame };
  });

  // ── scenario holograms: what you can make here ────────────────────
  // They float behind the pole as seen from the camera, drifting after it as it
  // turns, each projected from the ground by a faint beam.
  interface Holo {
    id: string;
    g: THREE.Group;
    mat: THREE.ShaderMaterial;
    top: THREE.Object3D;
    label: HTMLButtonElement;
    hover: number;
    angle: number;
    slot: number;
  }
  const HOLO_W = 5.2;
  // screens flank the signature landmark (straight behind it they would be hidden):
  // left, right, then further left, where the sky is open between the headline and the city
  const SLOTS = [1, -1, 2, -2]; // positive slots land on the left of the screen
  const HOLO_H = HOLO_W / 1.6;
  const holoUniforms = { uTime: { value: 0 } };
  const holos: Holo[] = data.scenarios.map((sc, i) => {
    const art = scenarioCanvas(sc.art, P.color.dark, seedBase + i * 13);
    const tex = new THREE.CanvasTexture(art);
    if (sc.replay) {
      // a scenario with a replay shows what the kit really rendered, not a drawing
      const img = new Image();
      img.onload = () => {
        const g = art.getContext('2d')!;
        const k = Math.max(art.width / img.width, art.height / img.height);
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, art.width, art.height);
        g.drawImage(img, (art.width - img.width * k) / 2, 0, img.width * k, img.height * k);
        tex.needsUpdate = true;
      };
      img.src = sc.replay.thumb;
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uTime: holoUniforms.uTime, uColor: { value: new THREE.Color(P.color.dark) }, uHover: { value: 0 }, uSeed: { value: i * 1.7 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `uniform sampler2D uMap; uniform float uTime; uniform vec3 uColor; uniform float uHover; uniform float uSeed; varying vec2 vUv;
        void main(){
          vec4 t = texture2D(uMap, vUv);
          float scan = 0.9 + 0.1*sin(vUv.y*420.0 - uTime*5.0);
          float sweep = smoothstep(0.0, 0.05, 0.05 - abs(fract(uTime*0.18 + uSeed) - vUv.y))*0.35;
          float d = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y)*1.6);
          float edge = 1.0 - smoothstep(0.0, 0.012, d);
          vec3 c = t.rgb*scan*(0.92 + uHover*0.2) + uColor*(edge*1.2 + sweep);
          float a = max(t.a*(0.9 + 0.1*sin(uTime*11.0 + uSeed*5.0)), edge);
          gl_FragColor = vec4(c, a*(0.86 + uHover*0.14));
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const g = new THREE.Group();
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(HOLO_W, HOLO_H), mat);
    g.add(screen);
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(HOLO_W * 1.5, HOLO_H * 1.7),
      new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,255,255,1)'), color: P.color.dark, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    halo.position.z = -0.05;
    g.add(halo);
    // the projector beam, from the ground up to the bottom edge of the screen
    const beamH = 6.5;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(HOLO_W * 0.36, 0.06, beamH, 24, 1, true),
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(P.color.dark) }, uTime: holoUniforms.uTime },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
          void main(){ float a = pow(vUv.y, 2.0)*0.09*(0.8 + 0.2*sin(vUv.y*24.0 - uTime*3.0)); gl_FragColor = vec4(uColor, a); }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    beam.scale.z = 0.12; // a flat fan rather than a cone
    beam.position.y = -HOLO_H / 2 - beamH / 2;
    g.add(beam);
    const top = new THREE.Object3D();
    top.position.y = HOLO_H / 2 + 0.25;
    g.add(top);
    scene.add(g);
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'lbl lbl-scenario';
    label.dataset.kind = 'scenario';
    label.dataset.id = sc.id;
    label.innerHTML = `<span class="n">${sc.title}</span>${sc.template ? `<span class="k">${data.strings['planet.templateTag']}</span>` : ''}`;
    label.setAttribute('aria-label', `${data.strings['planet.scenario']}: ${sc.title}`);
    labels.appendChild(label);
    const h: Holo = { id: sc.id, g, mat, top, label, hover: 0, angle: 0, slot: SLOTS[i] ?? i + 1 };
    hitMeshes.set(screen, h);
    return h;
  });
  const camAzimuth = () => Math.atan2(camera.position.x, camera.position.z);
  // on tall screens the screens close in and shrink so they stay in view
  const narrow = () => root.clientWidth < root.clientHeight;
  const holoSpread = () => (narrow() ? 0.46 : 0.68);
  for (const h of holos) h.angle = camAzimuth() + Math.PI + h.slot * holoSpread();

  // ── labels, hover, click ──────────────────────────────────────────
  const card = root.querySelector<HTMLElement>('.city-card')!;
  const cardTitle = card.querySelector<HTMLElement>('.c-title')!;
  const cardName = card.querySelector<HTMLElement>('.c-name')!;
  const cardBody = card.querySelector<HTMLElement>('.c-body')!;
  const cardLink = card.querySelector<HTMLAnchorElement>('.c-link')!;
  const cardUses = card.querySelector<HTMLElement>('.c-uses')!;
  const cityLinkText = cardLink.textContent || '';
  const cardReplay = card.querySelector<HTMLButtonElement>('.c-replay')!;
  // while a replay runs, the buildings whose capability the commands use light up
  let lit = new Set<string>();
  window.addEventListener('ku:replay-frame', (e) => {
    const d = (e as CustomEvent).detail;
    lit = new Set(d.kit === P.id ? (d.lights as string[]) : []);
    if (d.kit === P.id) closeCard();
  });
  window.addEventListener('ku:replay-end', () => (lit = new Set()));
  let cardReturn: HTMLElement | null = null;
  function openCard(id: string, from?: HTMLElement | null) {
    const b = data.buildings.find((x) => x.id === id)!;
    cardReturn = from ?? (document.activeElement as HTMLElement);
    cardName.textContent = b.name;
    cardTitle.textContent = b.title;
    cardBody.textContent = b.body;
    cardUses.hidden = true;
    cardLink.href = `#cap-${b.id}`;
    cardLink.textContent = cityLinkText;
    cardLink.removeAttribute('target');
    cardReplay.hidden = true;
    card.hidden = false;
    cardTitle.focus({ preventScroll: true });
  }
  function openScenario(id: string, from?: HTMLElement | null) {
    const sc = data.scenarios.find((x) => x.id === id)!;
    cardReturn = from ?? (document.activeElement as HTMLElement);
    cardName.textContent = `${data.strings['planet.scenario']}${sc.template ? ' · ' + data.strings['planet.templateTag'] : ''}`;
    cardTitle.textContent = sc.title;
    cardBody.textContent = sc.body;
    cardUses.textContent = `${data.strings['planet.uses']} ${sc.uses.join(' · ')}`;
    cardUses.hidden = false;
    cardLink.href = sc.template ?? '#scenarios';
    cardLink.textContent = sc.template ? data.strings['planet.openTemplate'] : data.strings['planet.allScenarios'];
    cardReplay.hidden = !sc.replay;
    if (sc.replay) cardReplay.dataset.replay = sc.replay.id;
    else delete cardReplay.dataset.replay;
    card.hidden = false;
    cardTitle.focus({ preventScroll: true });
  }
  const isHolo = (x: Landmark | Holo | null): x is Holo => !!x && 'slot' in x;
  function closeCard() {
    if (card.hidden) return;
    card.hidden = true;
    cardReturn?.focus({ preventScroll: true });
  }
  card.querySelector('.c-close')!.addEventListener('click', closeCard);
  labels.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.lbl');
    if (b) (b.dataset.kind === 'scenario' ? openScenario : openCard)(b.dataset.id!, b);
  });
  root.addEventListener('keydown', (e) => e.key === 'Escape' && closeCard());

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered: Landmark | Holo | null = null;
  let down: { x: number; y: number } | null = null;
  const pick = (ev: PointerEvent) => {
    const rc = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - rc.left) / rc.width) * 2 - 1, -((ev.clientY - rc.top) / rc.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects([...hitMeshes.keys()], false)[0];
    return hit ? hitMeshes.get(hit.object) ?? null : null;
  };
  canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    const lm = pick(e);
    if (isHolo(lm)) openScenario(lm.id, lm.label);
    else if (lm) openCard(lm.id, lm.label);
    else closeCard();
  });
  let lastMove: PointerEvent | null = null;
  canvas.addEventListener('pointermove', (e) => (lastMove = e));
  canvas.addEventListener('pointerleave', () => {
    lastMove = null;
    hovered = null;
    canvas.style.cursor = '';
  });
  labels.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement;
    const id = el.dataset.id;
    hovered = (el.dataset.kind === 'scenario' ? holos.find((h) => h.id === id) : landmarks.find((l) => l.id === id)) ?? null;
  });

  // ── theme ─────────────────────────────────────────────────────────
  window.addEventListener('ku:theme', (e) => {
    theme = (e as CustomEvent).detail;
    const dark = theme === 'dark';
    scene.background = skyTexture(theme);
    post.setTheme(theme);
    planetMat.map?.dispose();
    planetMat.map = planetTexture(P.surface.style, groundColor(), seedBase, 1024);
    planetMat.emissiveIntensity = dark ? 0.6 : 0.1;
    planetMat.needsUpdate = true;
    (atmo.material as THREE.ShaderMaterial).uniforms.uColor.value.set(kitColor());
    (atmo.material as THREE.ShaderMaterial).uniforms.uStrength.value = dark ? 0.7 : 0.5;
    ambient.intensity = dark ? 0.25 : 0.9;
    hemi.intensity = dark ? 0.45 : 0.8;
    sun.intensity = dark ? 1.1 : 2.2;
    accentMat.color.set(kitColor());
    accentMat.emissive.set(kitColor());
    accentMat.emissiveIntensity = dark ? 0.55 : 0.15;
    wallMat.color.set(wallColor());
    fillerMat.emissiveIntensity = dark ? 1.15 : 0.25;
    const tintNow = tints();
    fillers.forEach((m, k) => {
      blockTint[k].forEach((tint, i) => m.setColorAt(i, new THREE.Color(tintNow[tint])));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
    (scene.fog as THREE.Fog).color.set(fogColor());
    wallMat.emissiveIntensity = dark ? 1.5 : 0.35;
    glassMat.emissiveIntensity = dark ? 1.2 : 0.3;
    roadMat.color.set(kitColor());
    for (const nb of nebulae) {
      nb.material.opacity = dark ? 0.6 : 0.3;
      nb.material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      nb.material.needsUpdate = true;
    }
    (stars.material as THREE.PointsMaterial).opacity = dark ? 1 : 0.35;
    sig.setTheme(theme, hues());
  });
  (stars.material as THREE.PointsMaterial).opacity = theme === 'dark' ? 1 : 0.35;

  // ── size: on wide screens the city sits right of centre, clear of the headline
  // the lines of text and the buttons in the headline block, in stage coordinates
  let heroBoxes: { l: number; t: number; r: number; b: number }[] = [];
  function measureHero() {
    const rb = root.getBoundingClientRect();
    const range = document.createRange();
    heroBoxes = [...root.querySelectorAll('.hero-copy > *')].flatMap((el) => {
      range.selectNodeContents(el);
      return [...range.getClientRects()].map((r) => ({ l: r.left - rb.left, t: r.top - rb.top, r: r.right - rb.left, b: r.bottom - rb.top }));
    });
  }
  document.fonts?.ready.then(measureHero);
  function resize() {
    const w = root.clientWidth;
    const h = root.clientHeight;
    if (!w || !h) return;
    measureHero();
    renderer.setSize(w, h, false);
    post.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 58 : 38;
    if (w / h > 1.2) camera.setViewOffset(w, h, -w * 0.17, h * 0.04, w, h);
    // portrait: push the city down below the headline and buttons
    else camera.setViewOffset(w, h, 0, -h * 0.2, w, h);
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

  // ── landing descent (after the warp on the star map) ──────────────
  let descent: { t: number; from: THREE.Vector3 } | null = null;
  try {
    if (sessionStorage.getItem('ku-landing') === P.id && !reduced) descent = { t: 0, from: new THREE.Vector3(0, R + 70, 40) };
    sessionStorage.removeItem('ku-landing');
  } catch {
    /* no descent */
  }
  if (descent) {
    camera.position.copy(descent.from);
    controls.enabled = false;
    const skip = () => descent && (descent.t = 1);
    canvas.addEventListener('pointerdown', skip, { once: true });
    window.addEventListener('keydown', skip, { once: true });
  }
  const DESCENT = 0.45;

  // frame delta from rAF timestamps (THREE.Clock is deprecated)
  let last = performance.now();
  const clock = { getDelta: () => { const now = performance.now(); const d = (now - last) / 1000; last = now; return d; } };
  const tmp = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  let first = true;
  let elapsed = 0;
  let skip = false;
  let labelFrame = 0;
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

    if (descent) {
      descent.t += dt / DESCENT;
      camera.position.lerpVectors(descent.from, REST, ease.out(Math.min(1, descent.t)));
      camera.lookAt(TARGET);
      if (descent.t >= 1) {
        descent = null;
        controls.enabled = true;
      }
    } else controls.update(dt);
    const camDist = camera.position.distanceTo(TARGET);
    (scene.fog as THREE.Fog).near = camDist + 2;
    (scene.fog as THREE.Fog).far = camDist + 48;

    if (lastMove) {
      hovered = pick(lastMove);
      canvas.style.cursor = hovered ? 'pointer' : '';
      lastMove = null;
    }
    for (const l of landmarks) {
      const on = lit.has(l.id);
      const want = hovered === l || on ? 1 : 0;
      l.hover += (want - l.hover) * Math.min(1, dt * 10);
      l.work += ((on ? 1 : 0) - l.work) * Math.min(1, dt * 5);
      l.group.scale.setScalar(SCALE * (1 + l.hover * 0.1 + l.work * 0.16 * (1 + Math.sin(elapsed * 5) * 0.12 * motion)));
      l.pool.opacity = 0.55 + l.work * 0.45;
      l.pool.color.copy(l.poolColor).lerp(WORK, l.work * 0.8);
      l.spark.visible = l.work > 0.02;
      l.spark.material.opacity = l.work * (0.75 + Math.sin(elapsed * 6) * 0.25 * motion);
      l.label.classList.toggle('lit', on);
    }
    screenTex.offset.x = (elapsed * 0.05 * motion) % 1;
    corona.material.rotation += dt * 0.02 * motion;
    moon.rotation.y += dt * 0.03 * motion;
    (beam.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed * motion;
    sig.tick(elapsed * motion, dt * motion);

    holoUniforms.uTime.value = elapsed * (motion || 0.0001);
    const az = camAzimuth();
    for (const h of holos) {
      // drift after the camera so the screens stay behind the pole, with a little lag for depth
      const want = az + Math.PI + h.slot * holoSpread();
      h.angle += Math.atan2(Math.sin(want - h.angle), Math.cos(want - h.angle)) * Math.min(1, dt * (motion ? 1.6 : 20));
      const outer = Math.abs(h.slot) - 1; // 0 for the pair beside the landmark, 1 for the outer ones
      h.g.position.set(Math.sin(h.angle) * 12.5, R + (narrow() ? 1.1 : 2.7) - outer * 1.5 + Math.sin(elapsed * 0.9 + h.slot * 2) * 0.12 * motion, Math.cos(h.angle) * 12.5);
      h.g.lookAt(camera.position.x, h.g.position.y, camera.position.z);
      const hot = hovered === h ? 1 : 0;
      h.hover += (hot - h.hover) * Math.min(1, dt * 10);
      h.mat.uniforms.uHover.value = h.hover;
      h.g.scale.setScalar((1 - outer * 0.18) * (narrow() ? 0.72 : 1) * (1 + h.hover * 0.06));
    }

    carState.forEach((c, i) => {
      c.th += c.v * dt * motion;
      const { p } = onSurface(c.th, c.road, 0.09);
      m4.makeTranslation(p.x, p.y, p.z);
      cars.setMatrixAt(i, m4);
    });
    cars.instanceMatrix.needsUpdate = true;

    ships.forEach((s, k) => {
      s.t = (s.t + dt * 0.08 * motion) % 1;
      // drop in, hover over the pad, take off again
      const u = s.t;
      const ang = k * Math.PI + 0.6;
      let y: number, out: number;
      if (u < 0.35) {
        const a = ease.out(u / 0.35);
        y = 18 - a * 17.4;
        out = (1 - a) * 16;
      } else if (u < 0.6) {
        y = 0.6 + Math.sin(elapsed * 3) * 0.04;
        out = 0;
      } else {
        const a = ease.in((u - 0.6) / 0.4);
        y = 0.6 + a * 24;
        out = a * 18;
      }
      s.g.position.set(Math.cos(ang) * (0.35 + out), y, Math.sin(ang) * (0.35 + out));
      s.g.rotation.z = out * 0.04 * (k ? 1 : -1);
      s.flame.visible = u < 0.35 || u > 0.6;
    });

    post.render();

    camera.getWorldDirection(camDir);
    const W = root.clientWidth;
    const H = root.clientHeight;
    // nearest landmarks claim their label spot first; later ones step up to avoid overlaps
    const placedRects: { x: number; y: number; w: number; h: number }[] = [];
    labelFrame++;
    const order = landmarks
      .map((l) => ({ l, d: l.group.position.distanceToSquared(camera.position) }))
      .sort((a, b) => a.d - b.d);
    for (const { l } of order) {
      l.top.getWorldPosition(tmp);
      const anchorDist = tmp.distanceTo(camera.position);
      const normal = l.group.position.clone().normalize();
      const toCam = camera.position.clone().sub(l.group.position).normalize();
      const visible = tmp.clone().sub(camera.position).dot(camDir) > 0 && normal.dot(toCam) > 0.02;
      tmp.project(camera);
      const w = (l.label.dataset.w ? Number(l.label.dataset.w) : (l.label.dataset.w = String(l.label.offsetWidth), l.label.offsetWidth)) + 6;
      // keep the whole label on screen (narrow phones)
      const x = Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, (tmp.x * 0.5 + 0.5) * W));
      let y = (-tmp.y * 0.5 + 0.5) * H;
      const h = 30;
      if (visible) {
        for (let k = 0; k < 4; k++) {
          const hit = placedRects.find((r) => Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - y) < h);
          if (!hit) break;
          y = hit.y - h - 2;
        }
        placedRects.push({ x, y, w, h });
      }
      l.label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      // a label that covers the signature landmark fades so the landmark stays readable;
      // checked through the label's middle and its anchor, a few times a second
      if (visible && labelFrame % 8 === 0) {
        l.behind = [y - h / 2, y - 4].some((py) => {
          sigRay.setFromCamera(new THREE.Vector2((x / W) * 2 - 1, -(py / H) * 2 + 1), camera);
          const hit = sigRay.intersectObjects(sigSolids, false)[0];
          return !!hit && hit.distance < anchorDist;
        });
      }
      l.label.style.opacity = !visible ? '0' : l.behind && hovered !== l ? '0.35' : '1';
      l.label.classList.toggle('hot', hovered === l);
    }
    for (const h of holos) {
      h.top.getWorldPosition(tmp);
      const visible = tmp.clone().sub(camera.position).dot(camDir) > 0;
      tmp.project(camera);
      const hw = (h.label.dataset.w ? Number(h.label.dataset.w) : (h.label.dataset.w = String(h.label.offsetWidth), h.label.offsetWidth)) / 2 + 4;
      const hx = Math.min(W - hw, Math.max(hw, (tmp.x * 0.5 + 0.5) * W));
      // step up past building labels, like the buildings do among themselves
      let hy = (-tmp.y * 0.5 + 0.5) * H;
      // with no free spot below the top edge the label steps aside; the screen itself stays clickable
      let clear = visible;
      if (visible) {
        for (let k = 0; k < 4; k++) {
          const hit = placedRects.find((r) => Math.abs(r.x - hx) < r.w / 2 + hw && Math.abs(r.y - hy) < 30);
          if (!hit) break;
          hy = hit.y - 32;
        }
        clear =
          hy > 34 &&
          !placedRects.some((r) => Math.abs(r.x - hx) < r.w / 2 + hw && Math.abs(r.y - hy) < 30) &&
          // nor under the headline's text and buttons
          !heroBoxes.some((b) => hx - hw < b.r && hx + hw > b.l && hy - 30 < b.b && hy > b.t);
        if (clear) placedRects.push({ x: hx, y: hy, w: hw * 2, h: 30 });
      }
      h.label.style.transform = `translate3d(${hx.toFixed(1)}px, ${hy.toFixed(1)}px, 0) translate(-50%, -100%)`;
      h.label.style.opacity = clear ? '1' : '0';
      h.label.style.pointerEvents = clear ? '' : 'none';
      h.label.classList.toggle('hot', hovered === h);
    }
    if (first) {
      first = false;
      root.classList.add('live');
      root.querySelector('.poster-wrap')?.setAttribute('inert', '');
      root.querySelector('.poster-wrap')?.setAttribute('aria-hidden', 'true');
    }
  }
  await yieldToMain();
  await renderer.compileAsync(scene, camera).catch(() => undefined);
  await uploadTextures(renderer, scene);
  requestAnimationFrame(frame);
}

interface Mats {
  wallMat: THREE.Material;
  accentMat: THREE.Material;
  glassMat: THREE.Material;
  lightMat: THREE.Material;
  screenMat: THREE.Material;
}

/** One landmark per capability; the shape comes from the data file. */
function landmark(shape: string, m: Mats, seed: number): { mesh: THREE.Group; height: number } {
  const g = new THREE.Group();
  const box = (w: number, h: number, d: number, mat: THREE.Material, y = 0, x = 0, z = 0) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    o.position.set(x, y + h / 2, z);
    g.add(o);
    return o;
  };
  const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, y = 0, x = 0, z = 0, seg = 24) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    o.position.set(x, y + h / 2, z);
    g.add(o);
    return o;
  };
  const r = rng(seed * 13 + 1);
  let height = 3;
  switch (shape) {
    case 'tower': {
      box(1.8, 3.2, 1.8, m.glassMat);
      box(1.9, 0.12, 1.9, m.accentMat, 3.2);
      box(1.4, 2.0, 1.4, m.wallMat, 3.32);
      box(1.5, 0.12, 1.5, m.accentMat, 5.32);
      box(1.0, 1.4, 1.0, m.glassMat, 5.44);
      cyl(0.04, 0.04, 1.2, m.wallMat, 6.84);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), m.lightMat);
      tip.position.y = 8.1;
      g.add(tip);
      height = 8.2;
      break;
    }
    case 'dome': {
      cyl(1.7, 1.8, 1.0, m.wallMat);
      cyl(1.75, 1.75, 0.1, m.accentMat, 1.0);
      const d = new THREE.Mesh(new THREE.SphereGeometry(1.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.glassMat);
      d.position.y = 1.1;
      g.add(d);
      cyl(0.25, 0.3, 0.5, m.accentMat, 2.65);
      height = 3.2;
      break;
    }
    case 'block': {
      box(3.2, 1.4, 2.2, m.wallMat);
      box(3.3, 0.1, 2.3, m.accentMat, 1.4);
      box(1.0, 0.6, 1.0, m.accentMat, 1.5, -0.8, 0);
      box(1.0, 0.9, 1.0, m.glassMat, 1.5, 0.7, 0.2);
      height = 2.5;
      break;
    }
    case 'columns': {
      box(3.2, 0.3, 2.2, m.wallMat);
      for (let i = 0; i < 5; i++) cyl(0.14, 0.16, 1.8, m.wallMat, 0.3, -1.2 + i * 0.6, 0.85, 12);
      box(2.6, 1.8, 1.2, m.glassMat, 0.3, 0, -0.3);
      box(3.3, 0.14, 2.3, m.accentMat, 2.1);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.9, 0.8, 4, 1), m.accentMat);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.2, 1, 0.8);
      roof.position.y = 2.64;
      g.add(roof);
      height = 3.0;
      break;
    }
    case 'crane': {
      box(2.0, 1.2, 1.6, m.wallMat);
      box(0.3, 5.2, 0.3, m.accentMat, 0, 1.2, -0.6);
      box(4.2, 0.22, 0.22, m.accentMat, 5.0, 0.4, -0.6);
      box(0.6, 0.4, 0.4, m.wallMat, 4.8, 2.3, -0.6);
      box(0.03, 2.2, 0.03, m.wallMat, 2.8, -1.2, -0.6);
      box(0.5, 0.35, 0.5, m.glassMat, 2.45, -1.2, -0.6);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), m.lightMat);
      tip.position.set(2.5, 5.4, -0.6);
      g.add(tip);
      height = 5.5;
      break;
    }
    case 'screen': {
      box(2.6, 2.2, 1.4, m.wallMat);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), m.screenMat);
      scr.position.set(0, 3.0, 0.2);
      g.add(scr);
      box(0.12, 1.0, 0.12, m.accentMat, 2.2, -0.9, 0.1);
      box(0.12, 1.0, 0.12, m.accentMat, 2.2, 0.9, 0.1);
      height = 3.8;
      break;
    }
    case 'stack': {
      let y = 0;
      for (let i = 0; i < 5; i++) {
        const h = 0.55;
        const o = box(2.4 - i * 0.18, h, 1.8 - i * 0.12, i % 2 ? m.accentMat : m.glassMat, y, (r() - 0.5) * 0.4, (r() - 0.5) * 0.3);
        o.rotation.y = (r() - 0.5) * 0.35;
        y += h;
      }
      height = y + 0.2;
      break;
    }
    case 'spire':
    default: {
      cyl(0.9, 1.1, 3.0, m.wallMat);
      cyl(0.95, 0.95, 0.12, m.accentMat, 3.0);
      cyl(0.6, 0.85, 1.6, m.glassMat, 3.12);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 24), m.accentMat);
      cone.position.y = 5.82;
      g.add(cone);
      height = 6.9;
    }
  }
  return { mesh: g, height };
}

function scaffoldBox(w: number, h: number): THREE.LineSegments {
  const v: number[] = [];
  const hw = w / 2 + 0.25;
  const levels = Math.max(2, Math.round(h / 1.2));
  const corners = [
    [-hw, -hw],
    [hw, -hw],
    [hw, hw],
    [-hw, hw],
  ];
  for (const [x, z] of corners) v.push(x, 0, z, x, h, z);
  for (let l = 1; l <= levels; l++) {
    const y = (l / levels) * h;
    for (let i = 0; i < 4; i++) {
      const [x1, z1] = corners[i];
      const [x2, z2] = corners[(i + 1) % 4];
      v.push(x1, y, z1, x2, y, z2);
      if (l % 2) v.push(x1, y - h / levels, z1, x2, y, z2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#ffa53d' }));
}

/** A unit box whose side faces repeat the window grid `rows` times upwards; top and bottom stay dark. */
function windowedBox(rows: number): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4);
    if (face === 2 || face === 3) uv.setXY(i, 0.01, 0.01);
    else uv.setY(i, uv.getY(i) * rows);
  }
  return g;
}

/** Window tile for the street blocks: a 3 × 3 grid, about a quarter lit. */
function blockWindowTexture(seed: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 48;
  const g = c.getContext('2d')!;
  const r = rng(seed * 5 + 3);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 48, 48);
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (r() < 0.27) {
        g.fillStyle = r() < 0.85 ? `rgba(255,${205 + r() * 40},${150 + r() * 50},1)` : 'rgba(160,215,255,1)';
        g.fillRect(x * 16 + 5, y * 16 + 4, 6, 8);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}

/** Window grid for emissive maps: some windows lit, most dark. */
function windowTexture(seed: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  const r = rng(seed * 3 + 11);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 64, 64);
  for (let y = 4; y < 60; y += 8) {
    for (let x = 4; x < 60; x += 8) {
      if (r() < 0.3) {
        g.fillStyle = r() < 0.8 ? `rgba(255,${210 + r() * 40},${150 + r() * 60},1)` : 'rgba(150,210,255,1)';
        g.fillRect(x, y, 4, 4);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

function makeScreenTexture(name: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b0d22';
  g.fillRect(0, 0, 512, 128);
  g.font = '700 54px system-ui, sans-serif';
  g.textBaseline = 'middle';
  const grd = g.createLinearGradient(0, 0, 512, 0);
  grd.addColorStop(0, '#7cf0ff');
  grd.addColorStop(1, '#ff8ad8');
  g.fillStyle = grd;
  g.fillText(`${name} · KHP · ${name} · KHP ·`, 10, 66);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Faint banded ring seen from the surface (cad). */
function ringBands(color: string, inner: number, width: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uInner: { value: inner }, uWidth: { value: width } },
    vertexShader: /* glsl */ `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uInner; uniform float uWidth; varying vec3 vP;
      void main(){
        float t = clamp((length(vP.xy) - uInner) / uWidth, 0.0, 1.0);
        float bands = 0.5 + 0.5 * sin(t * 60.0) * sin(t * 17.0 + 0.7);
        float edge = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.8, t);
        gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.25), bands * edge * 0.28);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
