// Signature landmarks: one big structure per planet, standing on the pole in
// the middle of the city, that tells you which planet you are on at a glance
// (a tower crane on cad, a projector tower on film, a stack of books on note).
// They are scenery, not capabilities, so they have no label or card.
import * as THREE from 'three';
import { glowTexture, rng, type Theme } from './common';

/** Kit colours for the current theme. */
export interface KitHues {
  main: string;
  light: string;
  dark: string;
}

export interface Signature {
  group: THREE.Group;
  /** top of the structure, in its own units */
  height: number;
  /** footprint radius, in its own units */
  radius: number;
  tick(t: number, dt: number): void;
  setTheme(theme: Theme, hues: KitHues): void;
}

type Hue = keyof KitHues | `#${string}`;
interface Pos {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  /** place the centre at y instead of the base */
  centred?: boolean;
}

/** Adds simple meshes to a group; boxes, cylinders and cones stand on `y` unless centred. */
class Builder {
  constructor(readonly g: THREE.Object3D) {}
  private put<T extends THREE.Object3D>(o: T, lift: number, p: Pos): T {
    o.position.set(p.x ?? 0, (p.y ?? 0) + (p.centred ? 0 : lift), p.z ?? 0);
    o.rotation.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
    this.g.add(o);
    return o;
  }
  box(w: number, h: number, d: number, m: THREE.Material, p: Pos = {}) {
    return this.put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), h / 2, p);
  }
  cyl(rt: number, rb: number, h: number, m: THREE.Material, p: Pos = {}, seg = 20) {
    return this.put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m), h / 2, p);
  }
  cone(r: number, h: number, m: THREE.Material, p: Pos = {}, seg = 20) {
    return this.put(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m), h / 2, p);
  }
  sphere(r: number, m: THREE.Material, p: Pos = {}, seg = 14) {
    return this.put(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.7)), m), 0, p);
  }
  torus(r: number, t: number, m: THREE.Material, p: Pos = {}, arc = Math.PI * 2) {
    return this.put(new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 40, arc), m), 0, p);
  }
  plane(w: number, h: number, m: THREE.Material, p: Pos = {}) {
    return this.put(new THREE.Mesh(new THREE.PlaneGeometry(w, h), m), 0, { ...p, centred: true });
  }
  mesh(geo: THREE.BufferGeometry, m: THREE.Material, p: Pos = {}) {
    return this.put(new THREE.Mesh(geo, m), 0, { ...p, centred: true });
  }
  /** a thin beam from a to b */
  rod(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
    const len = a.distanceTo(b);
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), m);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    this.g.add(o);
    return o;
  }
  /** a child group; spin it or move it in tick() */
  pivot(p: Pos = {}): Builder {
    return new Builder(this.put(new THREE.Group(), 0, { ...p, centred: true }));
  }
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Soft additive light cone, brightest at the apex. */
function beamMaterial(color: string, strength: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uTime; uniform float uStrength; varying vec2 vUv;
      void main(){ float a = pow(vUv.y, 1.8) * uStrength * (0.88 + 0.12*sin(uTime*9.0 + vUv.y*7.0)); gl_FragColor = vec4(uColor, a); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/** A light cone whose apex sits at the pivot and which opens along +y. */
function beam(b: Builder, r: number, len: number, m: THREE.ShaderMaterial) {
  const geo = new THREE.ConeGeometry(r, len, 32, 1, true);
  geo.rotateX(Math.PI);
  geo.translate(0, len / 2, 0);
  return b.mesh(geo, m);
}

export function signature(id: string, hues: KitHues, shared: { wall: THREE.Material; glass: THREE.Material }, theme: Theme, seed: number): Signature {
  const root = new THREE.Group();
  const b = new Builder(root);
  const r = rng(seed * 31 + 7);
  const anims: ((t: number, dt: number) => void)[] = [];
  const spin = (p: Builder, axis: 'x' | 'y' | 'z', speed: number) => anims.push((_, dt) => (p.g.rotation[axis] += speed * dt));

  // materials: painted surfaces glow faintly at night so they read against the dark ground
  const painted: { m: THREE.MeshStandardMaterial; hue: Hue; glow: number }[] = [];
  const glowing: { m: THREE.MeshBasicMaterial; hue: Hue }[] = [];
  const beams: THREE.ShaderMaterial[] = [];
  const cache = new Map<string, THREE.Material>();
  const colorOf = (hue: Hue, h: KitHues) => (hue.startsWith('#') ? hue : h[hue as keyof KitHues]);
  const paint = (hue: Hue, glow = 0.12, metal = 0.2) => {
    const key = `p${hue}${glow}${metal}`;
    if (!cache.has(key)) {
      const c = colorOf(hue, hues);
      const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: metal, emissive: new THREE.Color(c), emissiveIntensity: theme === 'dark' ? glow : glow * 0.2 });
      painted.push({ m, hue, glow });
      cache.set(key, m);
    }
    return cache.get(key)!;
  };
  const neon = (hue: Hue) => {
    const key = `n${hue}`;
    if (!cache.has(key)) {
      const m = new THREE.MeshBasicMaterial({ color: colorOf(hue, hues), toneMapped: false });
      glowing.push({ m, hue });
      cache.set(key, m);
    }
    return cache.get(key)!;
  };
  const lightBeam = (color: string, strength: number) => {
    const m = beamMaterial(color, strength);
    beams.push(m);
    return m;
  };
  const stone = paint('#d8d4e6', 0.1);
  const ink = paint('#2a2c40', 0.08);
  const cream = paint('#fbf6e9', 0.25);
  const wall = shared.wall;
  const glass = shared.glass;

  let height = 10;
  let radius = 3.2;
  // a round plinth under every landmark, edged in the kit colour
  const plinth = (rad = 3.2) => {
    b.cyl(rad, rad + 0.15, 0.3, stone, {}, 40);
    b.torus(rad + 0.02, 0.05, neon('light'), { y: 0.3, rx: Math.PI / 2 });
    radius = rad + 0.15;
  };

  switch (id) {
    // Library Planet: a spiral tower of giant books with an open book and a reading lamp on top.
    case 'note': {
      plinth();
      const covers: Hue[] = ['main', '#e9c46a', 'dark', '#e76f51', 'light', 'main', '#2a9d8f', 'dark', '#e9c46a'];
      let y = 0.3;
      covers.forEach((c, i) => {
        const w = 4.2 - i * 0.24;
        const d = 2.9 - i * 0.13;
        const h = 0.75 + ((i * 5) % 3) * 0.16;
        const book = b.pivot({ y, ry: i * 0.24 - 0.7 });
        const cover = paint(c, 0.18);
        book.box(w, 0.1, d, cover);
        book.box(w, 0.1, d, cover, { y: h - 0.1 });
        book.box(0.16, h, d, cover, { x: -w / 2 + 0.08 });
        book.box(w - 0.24, h - 0.2, d - 0.14, cream, { y: 0.1, x: 0.06 });
        y += h;
      });
      const top = b.pivot({ y, ry: 0.25 });
      top.box(1.9, 0.14, 2.5, paint('main', 0.18), { x: -0.9, y: 0.25, rz: 0.2, centred: true });
      top.box(1.9, 0.14, 2.5, paint('main', 0.18), { x: 0.9, y: 0.25, rz: -0.2, centred: true });
      top.box(1.75, 0.08, 2.3, cream, { x: -0.88, y: 0.36, rz: 0.2, centred: true });
      top.box(1.75, 0.08, 2.3, cream, { x: 0.88, y: 0.36, rz: -0.2, centred: true });
      top.cyl(0.05, 0.05, 2.4, ink, { x: 1.9, z: -0.9 }, 8);
      top.box(1.3, 0.06, 0.06, ink, { x: 1.3, y: 2.4, z: -0.9 });
      top.cone(0.42, 0.45, ink, { x: 0.7, y: 1.95, z: -0.9 }, 16);
      top.sphere(0.2, neon('#ffe6a8'), { x: 0.7, y: 1.95, z: -0.9 });
      // loose pages drifting around the tower
      const pages = b.pivot();
      const pageMat = new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: new THREE.Color('#fff1c8'), emissiveIntensity: 0.6, side: THREE.DoubleSide });
      const loose = Array.from({ length: 7 }, (_, i) => {
        const p = pages.plane(0.7, 0.9, pageMat, {});
        return { p, a: (i / 7) * Math.PI * 2, y: 1.5 + i * 1.0, rad: 3.4 + (i % 2) * 0.5 };
      });
      anims.push((t) => {
        for (const l of loose) {
          const a = l.a + t * 0.25;
          l.p.position.set(Math.cos(a) * l.rad, l.y + Math.sin(t * 0.8 + l.a * 3) * 0.35, Math.sin(a) * l.rad);
          l.p.rotation.set(Math.sin(t + l.a) * 0.6, -a, Math.cos(t * 0.7 + l.a) * 0.5);
        }
      });
      height = y + 2.6;
      break;
    }

    // Warehouse Planet: a high-bay rack whose glowing beams draw a spreadsheet grid, with a shuttle on top.
    case 'table': {
      plinth();
      const cols = 5;
      const rows = 6;
      const cw = 1.08;
      const rh = 1.18;
      const W = cols * cw;
      const top = 0.3 + rows * rh;
      for (let i = 0; i <= cols; i++) for (const z of [-0.8, 0.8]) b.box(0.12, top - 0.3 + 0.2, 0.12, ink, { x: -W / 2 + i * cw, y: 0.3, z });
      const beamMat = paint('light', 0.75);
      for (let k = 0; k <= rows; k++) {
        const y = 0.3 + k * rh;
        b.box(W + 0.12, 0.08, 0.08, beamMat, { y, z: 0.82 });
        b.box(W, 0.06, 1.6, paint('#3a3d55', 0.1), { y: y - 0.06 });
      }
      const crateHues: Hue[] = ['main', 'light', '#f4a261', 'dark', '#e9c46a', 'main'];
      for (let k = 0; k < rows; k++)
        for (let i = 0; i < cols; i++) {
          if (r() > 0.8) continue;
          const h = rh * (0.45 + r() * 0.35);
          b.box(cw * 0.78, h, 1.3, paint(crateHues[Math.floor(r() * crateHues.length)], 0.16), { x: -W / 2 + (i + 0.5) * cw, y: 0.3 + k * rh + 0.02 });
        }
      // header row: column letters lit like a sheet
      const header = canvasTexture(512, 64, (g) => {
        g.fillStyle = '#0d1024';
        g.fillRect(0, 0, 512, 64);
        g.font = '700 40px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#e8f2ff';
        ['A', 'B', 'C', 'D', 'E'].forEach((c, i) => g.fillText(c, (i + 0.5) * (512 / 5), 34));
      });
      b.box(W + 0.2, 0.55, 0.12, ink, { y: top + 0.1, z: 0.8 });
      b.plane(W, 0.45, new THREE.MeshBasicMaterial({ map: header, toneMapped: false }), { y: top + 0.375, z: 0.87 });
      // rail and a shuttle hauling a crate along the top
      b.box(W + 0.6, 0.14, 0.14, ink, { y: top + 0.7, z: 0 });
      const shuttle = b.pivot({ y: top + 0.7 });
      shuttle.box(0.7, 0.35, 0.5, paint('#f2b705', 0.3), { y: 0.1 });
      shuttle.box(0.03, 1.2, 0.03, ink, { y: -1.15 });
      shuttle.box(0.7, 0.5, 0.7, paint('#f4a261', 0.2), { y: -1.6 });
      anims.push((t) => (shuttle.g.position.x = Math.sin(t * 0.45) * (W / 2 - 0.3)));
      height = top + 1.2;
      break;
    }

    // Doodle Planet: a towering corkboard of sticky notes joined by red string, with a giant pushpin and marker.
    case 'board': {
      plinth();
      b.box(0.3, 2.2, 0.3, ink, { x: -1.9, y: 0.3 });
      b.box(0.3, 2.2, 0.3, ink, { x: 1.9, y: 0.3 });
      const by = 2.4;
      const BW = 5.4;
      const BH = 4.8;
      b.box(BW, BH, 0.3, paint('#c79a64', 0.12), { y: by });
      const frame = paint('main', 0.2);
      b.box(BW + 0.3, 0.18, 0.4, frame, { y: by - 0.09 });
      b.box(BW + 0.3, 0.18, 0.4, frame, { y: by + BH - 0.09 });
      b.box(0.18, BH, 0.4, frame, { x: -BW / 2 - 0.06, y: by });
      b.box(0.18, BH, 0.4, frame, { x: BW / 2 + 0.06, y: by });
      const noteHues: Hue[] = ['#ffd04d', '#ff9a8b', '#8ecae6', '#b8e986', '#cdb4db', '#ffd04d', 'light', '#ff9a8b', '#8ecae6', '#ffd04d', '#b8e986', '#cdb4db'];
      const spots = noteHues.map((_, i) => new THREE.Vector3(-1.9 + (i % 4) * 1.27 + (r() - 0.5) * 0.3, by + 0.75 + Math.floor(i / 4) * 1.5 + (r() - 0.5) * 0.25, 0.2));
      const flutter: THREE.Object3D[] = [];
      noteHues.forEach((h, i) => {
        const n = b.box(1.0, 1.0, 0.05, paint(h, 0.3), { x: spots[i].x, y: spots[i].y, z: spots[i].z, rz: (r() - 0.5) * 0.25, centred: true });
        b.sphere(0.07, neon('#ff4d4d'), { x: spots[i].x, y: spots[i].y + 0.38, z: 0.26 });
        if (i % 5 === 2) flutter.push(n);
      });
      const string = paint('#e63946', 0.5);
      for (const [a, c] of [[0, 5], [5, 2], [2, 7], [4, 9], [9, 6], [6, 11]] as [number, number][]) {
        b.rod(spots[a].clone().setZ(0.27).setY(spots[a].y + 0.38), spots[c].clone().setZ(0.27).setY(spots[c].y + 0.38), 0.025, string);
      }
      b.sphere(0.5, paint('#e63946', 0.35), { x: -BW / 2 + 0.4, y: by + BH + 0.65, z: 0.1 });
      b.cyl(0.22, 0.32, 0.4, paint('#e63946', 0.35), { x: -BW / 2 + 0.4, y: by + BH + 0.05, z: 0.1 });
      b.cyl(0.04, 0.01, 0.5, stone, { x: -BW / 2 + 0.4, y: by + BH - 0.4, z: 0.1 }, 8);
      // a giant marker leaning on the board
      const marker = b.pivot({ x: 3.05, y: 0.3, z: 0.6, rz: 0.32 });
      marker.cyl(0.32, 0.32, 3.6, paint('#f6f4ff', 0.15), {}, 16);
      marker.cyl(0.34, 0.34, 0.9, paint('main', 0.3), { y: 3.6 }, 16);
      marker.cone(0.32, 0.6, ink, { y: -0.6, rx: Math.PI }, 16);
      anims.push((t) => flutter.forEach((n, i) => (n.rotation.x = -Math.max(0, Math.sin(t * 1.4 + i * 2)) * 0.35)));
      height = by + BH + 1.2;
      break;
    }

    // Darkroom Planet: a camera-shaped building with its lens on the city, a red safelight and prints drying behind.
    case 'photo': {
      plinth();
      const silver = paint('#d5d8e4', 0.22, 0.7);
      const body = paint('dark', 0.16);
      const BZ = -0.5;
      b.box(5.0, 2.3, 2.6, body, { y: 0.8, z: BZ });
      b.box(5.04, 0.5, 2.64, silver, { y: 0.3, z: BZ });
      b.box(5.04, 0.7, 2.64, silver, { y: 3.1, z: BZ });
      b.box(1.7, 1.0, 1.8, silver, { y: 3.8, z: BZ });
      b.box(1.0, 0.45, 0.05, neon('#9fe7ff'), { y: 4.1, z: BZ + 0.91 });
      b.cyl(0.24, 0.24, 0.25, paint('#e63946', 0.5), { x: 1.75, y: 3.8, z: BZ + 0.3 }, 16);
      b.cyl(0.42, 0.42, 0.3, ink, { x: 1.0, y: 3.8, z: BZ - 0.3 }, 20);
      b.torus(0.43, 0.04, neon('light'), { x: 1.0, y: 4.1, z: BZ - 0.3, rx: Math.PI / 2 });
      b.box(1.0, 0.6, 0.6, silver, { x: -1.75, y: 3.8, z: BZ });
      b.box(0.85, 0.42, 0.04, neon('#ffffff'), { x: -1.75, y: 3.89, z: BZ + 0.31 });
      // the lens, pointing at the city (+z)
      const lens = b.pivot({ y: 2.0, z: BZ + 1.3 });
      lens.cyl(1.35, 1.35, 0.6, ink, { z: 0.3, rx: Math.PI / 2, centred: true }, 40);
      lens.cyl(1.25, 1.25, 0.5, paint('main', 0.35), { z: 0.85, rx: Math.PI / 2, centred: true }, 40);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        lens.box(0.06, 0.1, 0.5, ink, { x: Math.cos(a) * 1.27, y: Math.sin(a) * 1.27, z: 0.85, rz: a, centred: true });
      }
      lens.cyl(1.1, 1.15, 0.45, ink, { z: 1.3, rx: Math.PI / 2, centred: true }, 40);
      lens.torus(1.1, 0.05, neon('light'), { z: 1.53 });
      lens.cyl(0.92, 0.92, 0.06, new THREE.MeshStandardMaterial({ color: '#0d1a33', roughness: 0.05, metalness: 0.9, emissive: new THREE.Color('#2a6dff'), emissiveIntensity: 0.7 }), { z: 1.5, rx: Math.PI / 2, centred: true }, 40);
      const iris = lens.pivot({ z: 1.55 });
      for (let i = 0; i < 6; i++) iris.box(0.62, 0.07, 0.02, neon('#cfe9ff'), { x: Math.cos((i / 6) * Math.PI * 2) * 0.45, y: Math.sin((i / 6) * Math.PI * 2) * 0.45, rz: (i / 6) * Math.PI * 2 + Math.PI / 2 + 0.5, centred: true });
      spin(iris, 'z', 0.5);
      // the darkroom safelight on a post
      b.cyl(0.06, 0.06, 3.6, ink, { x: -2.85, z: 0.9 }, 8);
      b.cone(0.38, 0.35, ink, { x: -2.85, y: 3.75, z: 0.9 }, 16);
      b.sphere(0.26, neon('#ff2e2e'), { x: -2.85, y: 3.75, z: 0.9 });
      // prints drying on a line behind the camera
      for (const x of [-2.4, 2.4]) b.cyl(0.05, 0.05, 4.6, ink, { x, z: -2.2 }, 8);
      b.rod(new THREE.Vector3(-2.4, 4.75, -2.2), new THREE.Vector3(2.4, 4.75, -2.2), 0.015, ink);
      const tints: Hue[] = ['main', '#e9c46a', '#8ecae6', '#ff9a8b', 'light'];
      tints.forEach((h, i) => {
        const x = -1.9 + i * 0.95;
        b.box(0.7, 0.85, 0.02, paint('#fff6e0', 0.35), { x, y: 3.85, z: -2.2 });
        b.box(0.54, 0.56, 0.03, paint(h, 0.35), { x, y: 4.05, z: -2.2 });
      });
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      flash.position.set(-1.75, 4.1, BZ + 0.5);
      flash.scale.setScalar(4);
      root.add(flash);
      anims.push((t) => {
        const k = (t % 5.5) / 0.35;
        flash.material.opacity = k < 1 ? 1 - k : 0;
      });
      height = 5.4;
      break;
    }

    // Cinema Planet: a projector tower with two spinning film reels and a beam thrown across the sky.
    case 'film': {
      plinth();
      b.cyl(1.15, 1.45, 5.6, wall, { y: 0.3 }, 8);
      for (const y of [1.9, 3.7]) b.cyl(1.3, 1.35, 0.15, paint('main', 0.3), { y }, 8);
      const py = 5.9;
      b.cyl(1.35, 1.2, 0.2, paint('main', 0.3), { y: 5.7 }, 8);
      b.box(2.8, 1.5, 1.7, paint('#24263a', 0.1), { y: py });
      b.box(2.84, 0.2, 1.74, paint('main', 0.3), { y: py + 0.4 });
      // lens to +x
      b.cyl(0.42, 0.52, 0.8, ink, { x: 1.75, y: py + 0.75, rz: -Math.PI / 2, centred: true }, 24);
      b.cyl(0.36, 0.36, 0.05, neon('#fff4d6'), { x: 2.17, y: py + 0.75, rz: -Math.PI / 2, centred: true }, 24);
      [-1.25, 1.25].forEach((x, k) => {
        b.box(0.12, 1.3, 0.12, ink, { x: x * 0.8, y: py + 1.5, z: k ? 0.2 : -0.2, rz: k ? -0.2 : 0.2 });
        const reel = b.pivot({ x, y: py + 1.5 + 1.25, z: k ? 0.2 : -0.2 });
        reel.torus(1.05, 0.13, paint('#c9ccd8', 0.2, 0.7), {});
        reel.torus(0.5, 0.06, paint('#c9ccd8', 0.2, 0.7), {});
        reel.cyl(0.98, 0.98, 0.16, paint('#2a2c40', 0.05), { rx: Math.PI / 2, centred: true }, 32);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          reel.box(0.12, 0.9, 0.2, paint('#c9ccd8', 0.2, 0.7), { x: Math.cos(a) * 0.55, y: Math.sin(a) * 0.55, rz: a + Math.PI / 2, centred: true });
        }
        reel.cyl(0.18, 0.18, 0.3, paint('main', 0.4), { rx: Math.PI / 2, centred: true }, 16);
        spin(reel, 'z', k ? -1.1 : -1.4);
      });
      // film running from the reels into the projector
      const film = paint('#3b2f2a', 0.05);
      b.rod(new THREE.Vector3(-1.25, py + 1.8, -0.2), new THREE.Vector3(-0.3, py + 1.5, 0), 0.05, film);
      b.rod(new THREE.Vector3(1.25, py + 1.8, 0.2), new THREE.Vector3(0.3, py + 1.5, 0), 0.05, film);
      const throwBeam = b.pivot({ x: 2.2, y: py + 0.75, rz: -Math.PI / 2 + 0.38 });
      const bm = lightBeam('#fff1c8', 0.38);
      beam(throwBeam, 2.4, 9, bm);
      height = py + 1.5 + 2.4;
      break;
    }

    // Press Planet: a printing press with turning rollers, fresh pages flying off the top and a lit ¶ sign.
    case 'doc': {
      plinth();
      b.box(4.4, 2.3, 2.6, wall, { y: 0.3, z: -0.3 });
      b.box(4.6, 0.25, 2.8, paint('main', 0.3), { y: 2.6, z: -0.3 });
      const sign = canvasTexture(256, 256, (g) => {
        g.fillStyle = '#0d1024';
        g.fillRect(0, 0, 256, 256);
        g.font = '700 200px Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#ffffff';
        g.fillText('¶', 128, 140);
      });
      b.box(1.5, 1.5, 0.1, paint('main', 0.3), { y: 0.65, z: 1.0 });
      b.plane(1.3, 1.3, new THREE.MeshBasicMaterial({ map: sign, toneMapped: false }), { y: 1.4, z: 1.06 });
      // the press: two side frames, three rollers, the paper web between them
      const fy = 2.85;
      for (const x of [-1.95, 1.95]) b.box(0.3, 5.2, 1.8, paint('dark', 0.2), { x, y: fy, z: -0.3 });
      const rollerY = [fy + 0.9, fy + 2.5, fy + 4.1];
      const rollerZ = [-0.75, 0.15, -0.75];
      rollerY.forEach((y, i) => {
        const rl = b.pivot({ y, z: rollerZ[i] });
        rl.cyl(0.55, 0.55, 3.6, ink, { rz: Math.PI / 2, centred: true }, 24);
        rl.box(3.62, 0.12, 0.12, paint('light', 0.5), { y: 0.5, centred: true });
        rl.box(3.62, 0.12, 0.12, paint('light', 0.5), { y: -0.5, centred: true });
        spin(rl, 'x', i % 2 ? 1.2 : -1.2);
      });
      for (let i = 0; i < 2; i++) {
        const a = new THREE.Vector3(0, rollerY[i], rollerZ[i] + (i % 2 ? -0.55 : 0.55));
        const c = new THREE.Vector3(0, rollerY[i + 1], rollerZ[i + 1] + (i % 2 ? 0.55 : -0.55));
        const len = a.distanceTo(c);
        const web = b.box(3.3, len, 0.03, cream, { centred: true });
        web.position.copy(a).add(c).multiplyScalar(0.5);
        web.rotation.x = Math.atan2(c.z - a.z, c.y - a.y);
      }
      // sheets coming off the top roller, sailing up and away
      const sheetMat = new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: new THREE.Color('#fff1c8'), emissiveIntensity: 0.55, side: THREE.DoubleSide });
      const sheets = Array.from({ length: 6 }, (_, i) => ({ p: b.plane(1.2, 0.85, sheetMat), o: i / 6 }));
      anims.push((t) => {
        for (const s of sheets) {
          const u = (t * 0.12 + s.o) % 1;
          const a = s.o * Math.PI * 2 + u * 1.6;
          s.p.position.set(Math.cos(a) * (0.2 + u * 3.4), rollerY[2] + 0.7 + u * 4, -0.75 + Math.sin(a) * (0.2 + u * 3.4));
          s.p.rotation.set(-Math.PI / 2 + u * 2.5, a, u * 1.5);
          s.p.scale.setScalar(u < 0.1 ? u / 0.1 : u > 0.85 ? (1 - u) / 0.15 : 1);
        }
      });
      height = fy + 5.6;
      break;
    }

    // Finance Planet: an exchange with a columned base, a ticker ring and a live bar chart on the roof.
    case 'sheet': {
      plinth(3.3);
      b.box(5.4, 0.25, 4.2, stone, { y: 0.3 });
      b.box(5.0, 0.25, 3.8, stone, { y: 0.55 });
      b.box(4.2, 2.2, 2.6, wall, { y: 0.8, z: -0.4 });
      for (let i = 0; i < 6; i++) b.cyl(0.17, 0.2, 2.1, stone, { x: -2.0 + i * 0.8, y: 0.8, z: 1.25 }, 12);
      b.box(4.8, 0.3, 3.6, paint('main', 0.3), { y: 3.0, z: 0 });
      b.box(3.0, 3.8, 2.4, glass, { y: 3.3, z: -0.4 });
      b.box(3.2, 0.2, 2.6, paint('main', 0.3), { y: 7.1, z: -0.4 });
      const ticker = canvasTexture(1024, 64, (g) => {
        g.fillStyle = '#071018';
        g.fillRect(0, 0, 1024, 64);
        g.font = '700 34px ui-monospace, monospace';
        g.textBaseline = 'middle';
        const items = ['SUM +2.4%', 'AVG +0.8%', 'VLOOKUP −0.3%', 'PIVOT +5.1%', 'IF +1.2%', 'XLOOKUP +3.0%'];
        let x = 16;
        for (const it of items) {
          g.fillStyle = it.includes('−') ? '#ff6b6b' : '#4fe08a';
          g.fillText(it, x, 34);
          x += g.measureText(it).width + 40;
        }
      });
      ticker.wrapS = THREE.RepeatWrapping;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.5, 48, 1, true), new THREE.MeshBasicMaterial({ map: ticker, toneMapped: false, side: THREE.DoubleSide }));
      ring.position.set(0, 5.3, -0.4);
      root.add(ring);
      anims.push((t) => (ticker.offset.x = (t * 0.03) % 1));
      // the board on the roof
      b.box(4.6, 2.6, 0.25, ink, { y: 7.3, z: 0.2 });
      const bars: THREE.Mesh[] = [];
      const barGeo = new THREE.BoxGeometry(0.4, 1, 0.08).translate(0, 0.5, 0);
      const base = [0.6, 1.0, 0.8, 1.4, 1.1, 1.8, 1.5];
      base.forEach((_, i) => {
        const m = new THREE.Mesh(barGeo, neon(i === 2 || i === 4 ? '#ff6b6b' : '#4fe08a'));
        m.position.set(-1.8 + i * 0.6, 7.55, 0.36);
        root.add(m);
        bars.push(m);
      });
      anims.push((t) => bars.forEach((m, i) => (m.scale.y = base[i] * (0.8 + 0.2 * Math.sin(t * 1.3 + i * 1.7)))));
      height = 10.1;
      break;
    }

    // Theater Planet: a theatre whose curtains part on a lit slide, with searchlights sweeping the sky.
    case 'slide': {
      plinth();
      b.box(5.0, 3.4, 3.0, wall, { y: 0.3, z: -0.7 });
      b.cyl(2.5, 2.5, 3.0, paint('main', 0.25), { y: 3.7, z: -0.7, rx: Math.PI / 2, centred: true }, 32);
      const gold = paint('#e9b949', 0.35, 0.6);
      const ay = 2.0;
      b.torus(1.75, 0.2, gold, { y: ay, z: 0.85 }, Math.PI);
      b.box(0.4, ay - 0.3, 0.4, gold, { x: -1.75, y: 0.3, z: 0.85 });
      b.box(0.4, ay - 0.3, 0.4, gold, { x: 1.75, y: 0.3, z: 0.85 });
      const deck = canvasTexture(512, 320, (g) => {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, 512, 320);
        g.fillStyle = '#1d1e2c';
        g.font = '700 46px system-ui, sans-serif';
        g.fillText('Q4 launch', 34, 70);
        g.fillStyle = '#c0c4d6';
        g.fillRect(34, 92, 200, 10);
        const heights = [60, 100, 80, 150, 190];
        heights.forEach((h, i) => {
          g.fillStyle = i === 4 ? '#ff7a59' : '#5b7cfa';
          g.fillRect(40 + i * 56, 290 - h, 40, h);
        });
        g.fillStyle = '#ffd166';
        g.beginPath();
        g.arc(410, 200, 70, 0, Math.PI * 1.4);
        g.lineTo(410, 200);
        g.fill();
      });
      b.plane(3.0, 1.9, new THREE.MeshBasicMaterial({ map: deck, color: '#c4c4c4', toneMapped: false }), { y: 1.35, z: 0.82 });
      b.box(3.4, 0.25, 1.0, stone, { y: 0.3, z: 1.2 });
      const curtain = paint('#b3122e', 0.3);
      // curtains gather towards the pillars as they open
      const left = b.pivot({ x: -1.6, y: 0.55, z: 0.95 });
      const right = b.pivot({ x: 1.6, y: 0.55, z: 0.95 });
      left.box(1.6, 2.9, 0.1, curtain, { x: 0.8 });
      right.box(1.6, 2.9, 0.1, curtain, { x: -0.8 });
      anims.push((t) => {
        const open = 0.5 + 0.5 * Math.sin(t * 0.35);
        left.g.scale.x = right.g.scale.x = 1 - open * 0.78;
      });
      for (let i = 0; i < 13; i++) {
        const a = (i / 12) * Math.PI;
        b.sphere(0.09, neon('#ffe08a'), { x: Math.cos(a) * 2.1, y: ay + Math.sin(a) * 2.1, z: 0.95 });
      }
      const lights = [-2.1, 2.1].map((x, k) => {
        b.cyl(0.25, 0.3, 0.4, ink, { x, y: 5.0, z: -0.7 }, 12);
        const p = b.pivot({ x, y: 5.4, z: -0.7 });
        beam(p, 0.9, 8, lightBeam('light', 0.26));
        return { p, k };
      });
      anims.push((t) => lights.forEach(({ p, k }) => p.g.rotation.set(Math.sin(t * 0.5 + k * 2) * 0.25, 0, (k ? -1 : 1) * (0.25 + 0.2 * Math.sin(t * 0.7 + k)))));
      height = 7.2;
      break;
    }

    // Archive Planet: a skyscraper shaped like a page with a folded corner, lines of text lit up its face.
    case 'pdf': {
      plinth();
      const PW = 3.4;
      const PH = 8.2;
      const fold = 1.1;
      const page = new THREE.Shape();
      page.moveTo(-PW / 2, 0);
      page.lineTo(PW / 2, 0);
      page.lineTo(PW / 2, PH - fold);
      page.lineTo(PW / 2 - fold, PH);
      page.lineTo(-PW / 2, PH);
      page.closePath();
      const DEPTH = 1.6;
      const pageGeo = new THREE.ExtrudeGeometry(page, { depth: DEPTH, bevelEnabled: false });
      pageGeo.translate(0, 0, -DEPTH / 2);
      b.mesh(pageGeo, paint('#f4f1ea', 0.22), { y: 0.3 });
      const corner = new THREE.Shape();
      corner.moveTo(PW / 2 - fold, PH);
      corner.lineTo(PW / 2 - fold, PH - fold);
      corner.lineTo(PW / 2, PH - fold);
      corner.closePath();
      const cornerGeo = new THREE.ExtrudeGeometry(corner, { depth: 0.12, bevelEnabled: false });
      b.mesh(cornerGeo, paint('#c9c3b6', 0.15), { y: 0.3, z: DEPTH / 2 });
      // lit lines of text on both faces
      const text = neon('light');
      for (const side of [1, -1]) {
        for (let i = 0; i < 9; i++) {
          const w = i % 4 === 3 ? 1.4 : 2.5 - (i === 0 ? 0.8 : 0);
          const y = 0.3 + PH - 1.8 - i * 0.5;
          if (y < 3.1) break;
          b.box(w, 0.12, 0.03, text, { x: -PW / 2 + 0.4 + w / 2, y, z: side * (DEPTH / 2 + 0.02) });
        }
      }
      const band = canvasTexture(512, 160, (g) => {
        g.fillStyle = '#e1251b';
        g.fillRect(0, 0, 512, 160);
        g.font = '900 120px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#ffffff';
        g.fillText('PDF', 256, 86);
      });
      const bandMat = new THREE.MeshBasicMaterial({ map: band, toneMapped: false });
      b.box(PW + 0.3, 1.1, DEPTH + 0.2, paint('#e1251b', 0.4), { y: 1.4 });
      b.plane(PW, 1.0, bandMat, { y: 1.95, z: DEPTH / 2 + 0.11 });
      b.plane(PW, 1.0, bandMat, { y: 1.95, z: -DEPTH / 2 - 0.11, ry: Math.PI });
      // archive boxes and a letterbox at the foot
      for (let i = 0; i < 3; i++) b.box(0.9, 0.6, 0.7, paint('#c9a26b', 0.15), { x: -2.3, y: 0.3 + i * 0.6, z: 0.9, ry: i * 0.15 });
      b.cyl(0.32, 0.32, 1.0, paint('#d62828', 0.3), { x: 2.3, y: 0.3, z: 1.0 }, 16);
      b.sphere(0.32, paint('#d62828', 0.3), { x: 2.3, y: 1.3, z: 1.0 });
      height = PH + 1.1;
      break;
    }

    // Neon Planet: a slim tower crowned by a pen-tool nib, wrapped in a glowing Bézier curve and orbiting rings.
    case 'vector': {
      plinth();
      b.box(1.5, 6.6, 1.5, wall, { y: 0.3 });
      b.box(1.7, 0.2, 1.7, paint('main', 0.35), { y: 6.9 });
      const nib = new THREE.Shape();
      nib.moveTo(0, 2.6);
      nib.lineTo(0.95, 0.9);
      nib.lineTo(0.6, 0);
      nib.lineTo(-0.6, 0);
      nib.lineTo(-0.95, 0.9);
      nib.closePath();
      const nibGeo = new THREE.ExtrudeGeometry(nib, { depth: 0.4, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
      nibGeo.translate(0, 0, -0.2);
      b.mesh(nibGeo, paint('light', 0.45, 0.5), { y: 7.1 });
      b.box(0.08, 1.2, 0.5, neon('#1d1e2c'), { y: 7.1 + 1.3, centred: true });
      b.sphere(0.16, neon('#ffffff'), { y: 7.1 + 0.85 });
      // the curve and its handles
      const p0 = new THREE.Vector3(-3.0, 1.0, 1.2);
      const c0 = new THREE.Vector3(-3.4, 6.5, 1.2);
      const c1 = new THREE.Vector3(3.4, 1.5, 1.2);
      const p1 = new THREE.Vector3(2.8, 6.8, 0.9);
      const curve = new THREE.CubicBezierCurve3(p0, c0, c1, p1);
      b.mesh(new THREE.TubeGeometry(curve, 80, 0.09, 8, false), neon('#ff4fd8'));
      const handle = neon('#9fe7ff');
      for (const [a, c] of [[p0, c0], [p1, c1]]) {
        b.rod(a, c, 0.025, handle);
        b.box(0.32, 0.32, 0.32, neon('#ffffff'), { x: a.x, y: a.y, z: a.z, ry: Math.PI / 4, rx: Math.PI / 4, centred: true });
        b.sphere(0.17, handle, { x: c.x, y: c.y, z: c.z });
      }
      const rings: [Hue, number, number, number][] = [['#a6ff4a', 1.7, 4.2, 0.9], ['#4ff0ff', 1.3, 2.6, -1.3]];
      for (const [hue, rad, y, speed] of rings) {
        const tilt = b.pivot({ y, rx: 0.35, rz: speed > 0 ? 0.2 : -0.25 });
        const ring = tilt.pivot();
        ring.torus(rad, 0.06, paint(hue, 0.7), { rx: Math.PI / 2 });
        ring.sphere(0.14, neon('#ffffff'), { x: rad });
        spin(ring, 'y', speed);
      }
      height = 7.1 + 2.8;
      break;
    }

    // Publishing Planet: a tower of fanned pages turning slowly under a rotating magazine cover.
    case 'layout': {
      plinth();
      b.box(3.6, 1.5, 2.8, wall, { y: 0.3 });
      b.box(3.8, 0.15, 3.0, paint('main', 0.3), { y: 1.8 });
      const fan = b.pivot({ y: 1.95 });
      const pageHues: Hue[] = ['#fbf6e9', 'main', '#fbf6e9', 'light', '#fbf6e9', 'dark', '#fbf6e9', 'main', '#fbf6e9', 'light'];
      pageHues.forEach((h, i) => fan.box(3.1 - i * 0.08, 0.1, 2.1 - i * 0.04, paint(h, 0.25), { y: i * 0.4, ry: i * 0.22, z: 0, x: 0 }));
      spin(fan, 'y', 0.15);
      b.cyl(0.15, 0.15, 4.2, ink, { y: 1.95 }, 8);
      const cover = canvasTexture(320, 420, (g) => {
        const grd = g.createLinearGradient(0, 0, 0, 420);
        grd.addColorStop(0, '#ff8ad8');
        grd.addColorStop(1, '#5b3df5');
        g.fillStyle = grd;
        g.fillRect(0, 0, 320, 420);
        g.fillStyle = '#ffffff';
        g.font = '900 64px system-ui, sans-serif';
        g.fillText('KITION', 22, 76);
        g.fillStyle = 'rgba(255,255,255,.9)';
        g.beginPath();
        g.arc(200, 240, 90, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffd166';
        g.fillRect(30, 300, 120, 80);
        g.fillStyle = '#ffffff';
        g.fillRect(30, 110, 150, 12);
        g.fillRect(30, 132, 110, 12);
      });
      const coverMat = new THREE.MeshBasicMaterial({ map: cover, color: '#c4c4c4', toneMapped: false });
      const mag = b.pivot({ y: 7.9 });
      mag.box(2.5, 3.3, 0.14, paint('#f6f4ff', 0.2), { centred: true });
      mag.plane(2.4, 3.2, coverMat, { z: 0.08 });
      mag.plane(2.4, 3.2, coverMat, { z: -0.08, ry: Math.PI });
      spin(mag, 'y', 0.35);
      height = 7.9 + 1.8;
      break;
    }

    // Fireworks Planet: a lit Ferris wheel and a launch tower sending bursts over the city.
    case 'motion': {
      plinth();
      const wy = 4.0;
      const W = 2.9;
      for (const z of [-0.45, 0.45])
        for (const x of [-1.4, 1.4]) b.rod(new THREE.Vector3(x, 0.3, z), new THREE.Vector3(0, wy, z), 0.1, ink);
      const wheel = b.pivot({ y: wy });
      for (const z of [-0.35, 0.35]) wheel.torus(W, 0.08, paint('main', 0.4), { z });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        wheel.box(0.06, W, 0.06, ink, { rz: a, x: (Math.sin(-a) * W) / 2, y: (Math.cos(a) * W) / 2, centred: true });
      }
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        wheel.sphere(0.08, neon(i % 2 ? '#fff3b0' : 'light'), { x: Math.cos(a) * W, y: Math.sin(a) * W, z: 0.42 });
      }
      wheel.cyl(0.3, 0.3, 1.0, paint('main', 0.4), { rx: Math.PI / 2, centred: true }, 16);
      const cabins = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const c = wheel.pivot({ x: Math.cos(a) * W, y: Math.sin(a) * W });
        c.box(0.55, 0.5, 0.5, paint(i % 2 ? 'light' : '#ffd166', 0.35), { y: -0.55 });
        c.box(0.03, 0.3, 0.03, ink, { y: -0.3 });
        return c;
      });
      anims.push((_, dt) => {
        wheel.g.rotation.z += dt * 0.25;
        for (const c of cabins) c.g.rotation.z = -wheel.g.rotation.z;
      });
      // the launch tower and its bursts
      b.cyl(0.2, 0.4, 5.6, ink, { x: 2.3, y: 0.3, z: -1.8 }, 8);
      b.sphere(0.3, neon('#ff7bd5'), { x: 2.3, y: 6.0, z: -1.8 });
      const COUNT = 70;
      const launch = new THREE.Vector3(2.3, 6.0, -1.8);
      const bursts = (['#ff7bd5', '#ffd166', '#7cf0ff'] as const).map((color, k) => {
        const dirs = Array.from({ length: COUNT }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(0.7 + r() * 0.3));
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(COUNT * 3), 3));
        const mat = new THREE.PointsMaterial({ color, size: 0.45, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
        const pts = new THREE.Points(geo, mat);
        pts.frustumCulled = false;
        root.add(pts);
        const at = new THREE.Vector3(-2.2 + k * 2.2, 9.5 + (k % 2) * 1.6, -1.2 + k * 0.6);
        return { pts, geo, mat, dirs, at, offset: k / 3 + 0.08 };
      });
      anims.push((t) => {
        for (const bu of bursts) {
          const u = (t / 3.6 + bu.offset) % 1;
          const pos = bu.geo.attributes.position as THREE.BufferAttribute;
          if (u < 0.22) {
            // the shell climbing to its burst point
            const k = u / 0.22;
            const p = launch.clone().lerp(bu.at, k);
            for (let i = 0; i < COUNT; i++) pos.setXYZ(i, p.x, p.y, p.z);
            bu.mat.opacity = 1;
            bu.mat.size = 0.25;
          } else {
            const k = (u - 0.22) / 0.78;
            const spread = (1 - Math.pow(1 - k, 3)) * 2.6;
            for (let i = 0; i < COUNT; i++) {
              const d = bu.dirs[i];
              pos.setXYZ(i, bu.at.x + d.x * spread, bu.at.y + d.y * spread - k * k * 1.2, bu.at.z + d.z * spread);
            }
            bu.mat.opacity = Math.pow(1 - k, 1.5);
            bu.mat.size = 0.45;
          }
          pos.needsUpdate = true;
        }
      });
      height = wy + W + 0.6;
      break;
    }

    // Construction Planet: a tower crane swinging over a half-built frame laid out on a blueprint.
    case 'scene': {
      b.cyl(3.4, 3.8, .8, paint('dark'));
      const model = b.pivot({ y: 5 });
      model.box(4, 4, 4, paint('main', .4, .65), { centred: true, rx: .35, rz: .25 });
      const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.2, 5.2, 5.2)), new THREE.LineBasicMaterial({ color: hues.light }));
      model.g.add(cage);
      spin(model, 'y', .2);
      for (const x of [-2.4, 2.4]) b.cyl(.15, .22, 3.4, paint('light'), { x });
      height = 9; radius = 4;
      break;
    }
    case 'design': {
      b.cyl(3.6, 4, .7, paint('dark'));
      for (let i = 0; i < 3; i++) {
        const panel = b.pivot({ x: (i - 1) * 2.4, y: 1 + i * .9, z: (i - 1) * -.6 });
        panel.box(2.4, 5.5, .35, paint('main', .3));
        panel.box(1.8, .7, .12, paint('light', .6), { y: 4, z: .25 });
        for (let j = 0; j < 3; j++) panel.box(1.8, .4, .12, paint('#d4fff0', .3), { y: 1 + j * .85, z: .25 });
      }
      height = 9; radius = 5;
      break;
    }
    case 'html': {
      b.cyl(3.6, 4, .7, paint('dark'));
      b.box(6.4, 4.8, .6, paint('main', .3), { y: 2 });
      b.box(5.6, 3.9, .15, paint('#0b1023'), { y: 2.45, z: .4 });
      for (const side of [-1, 1]) {
        b.rod(new THREE.Vector3(side * 2, 4.4, .7), new THREE.Vector3(side * .9, 5.4, .7), .14, neon('light'));
        b.rod(new THREE.Vector3(side * 2, 4.4, .7), new THREE.Vector3(side * .9, 3.4, .7), .14, neon('light'));
      }
      b.cyl(.3, .6, 2, paint('light'));
      height = 7; radius = 4;
      break;
    }
    case 'cad':
    default: {
      plinth(3.3);
      b.box(5.6, 0.06, 4.6, paint('#24508a', 0.35), { y: 0.3 });
      const grid = neon('#9ec3ee');
      for (let i = 0; i <= 7; i++) b.box(0.025, 0.02, 4.6, grid, { x: -2.8 + i * 0.8, y: 0.36 });
      for (let i = 0; i <= 5; i++) b.box(5.6, 0.02, 0.025, grid, { z: -2.3 + i * 0.92, y: 0.36 });
      const fx = -0.8;
      const fz = -0.6;
      const steel = paint('#b8bfd6', 0.15, 0.6);
      for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]] as [number, number][]) b.box(0.18, 6.0, 0.18, steel, { x: fx + x, y: 0.36, z: fz + z });
      for (const y of [1.9, 3.5, 5.1]) b.box(2.5, 0.14, 2.5, stone, { x: fx, y, z: fz });
      b.box(2.2, 1.5, 2.2, glass, { x: fx, y: 0.36, z: fz });
      b.box(2.2, 1.45, 2.2, glass, { x: fx, y: 2.04, z: fz });
      // the crane: a lattice mast, a cab, and a jib that swings
      const yellow = paint('#f2b705', 0.4, 0.3);
      const mx = 1.7;
      const mz = 1.1;
      const MH = 10.4;
      const half = 0.28;
      const corners: [number, number][] = [[-half, -half], [half, -half], [half, half], [-half, half]];
      for (const [x, z] of corners) b.box(0.09, MH, 0.09, yellow, { x: mx + x, y: 0.36, z: mz + z });
      for (let y = 0.36; y < MH; y += 0.8)
        for (let k = 0; k < 4; k++) {
          const [x1, z1] = corners[k];
          const [x2, z2] = corners[(k + 1) % 4];
          b.rod(new THREE.Vector3(mx + x1, y, mz + z1), new THREE.Vector3(mx + x2, y + 0.8, mz + z2), 0.025, yellow);
        }
      const jib = b.pivot({ x: mx, y: MH + 0.36, z: mz });
      jib.box(0.9, 0.7, 0.8, glass, { x: 0.4, y: -0.75 });
      jib.box(7.0, 0.32, 0.4, yellow, { x: -2.1 });
      jib.box(2.4, 0.36, 0.45, yellow, { x: 2.3 });
      jib.box(0.9, 0.8, 0.7, paint('#7d8296', 0.1), { x: 3.0, y: -0.85 });
      jib.box(0.18, 1.6, 0.18, yellow, { y: 0.32 });
      const apex = new THREE.Vector3(0, 1.92, 0);
      jib.rod(apex, new THREE.Vector3(-5.4, 0.32, 0), 0.02, ink);
      jib.rod(apex, new THREE.Vector3(3.4, 0.36, 0), 0.02, ink);
      const trolley = jib.pivot({ x: -3.5 });
      trolley.box(0.4, 0.2, 0.5, ink, { y: -0.2 });
      const cable = trolley.box(0.025, 1, 0.025, ink, { centred: true });
      const load = trolley.pivot();
      load.box(1.8, 0.22, 0.32, paint('main', 0.35), { centred: true });
      load.box(0.4, 0.15, 0.15, yellow, { y: 0.18, centred: true });
      const warn = [jib.sphere(0.13, neon('#ff3b30'), { y: 2.0 }), jib.sphere(0.11, neon('#ff3b30'), { x: -5.5, y: 0.35 })];
      spin(jib, 'y', 0.12);
      anims.push((t) => {
        trolley.g.position.x = -3.3 - Math.sin(t * 0.3) * 1.6;
        const drop = 2.6 + Math.sin(t * 0.45) * 1.2;
        cable.scale.y = drop;
        cable.position.y = -drop / 2 - 0.2;
        load.g.position.y = -drop - 0.3;
        const on = Math.sin(t * 3) > 0.2;
        for (const w of warn) w.visible = on;
      });
      height = MH + 2.4;
      break;
    }
  }

  return {
    group: root,
    height,
    radius,
    tick(t, dt) {
      for (const a of anims) a(t, dt);
      for (const m of beams) m.uniforms.uTime.value = t;
    },
    setTheme(th, h) {
      for (const { m, hue, glow } of painted) {
        const c = colorOf(hue, h);
        m.color.set(c);
        m.emissive.set(c);
        m.emissiveIntensity = th === 'dark' ? glow : glow * 0.2;
      }
      for (const { m, hue } of glowing) m.color.set(colorOf(hue, h));
    },
  };
}
