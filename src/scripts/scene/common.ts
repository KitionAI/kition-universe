// Shared three.js helpers for the universe and planet scenes: procedural
// textures (no image downloads), glow sprites, starfield, theme palettes.
import * as THREE from 'three';

export type Theme = 'light' | 'dark';

export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
};

export function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)'): THREE.Texture {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.45)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let dotTex: THREE.Texture | undefined;
export function dotTexture(): THREE.Texture {
  if (dotTex) return dotTex;
  const [c, g] = canvas(32, 32);
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

export type SurfaceStyle = 'bands' | 'craters' | 'grid' | 'swirl' | 'patches';

/** Equirectangular planet texture drawn on a canvas. */
export function planetTexture(style: SurfaceStyle, base: string, seed: number, size = 512): THREE.Texture {
  const W = size;
  const H = size / 2;
  const [c, g] = canvas(W, H);
  const r = rng(seed * 977 + 13);
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  if (style === 'bands') {
    for (let i = 0; i < 22; i++) {
      const y = r() * H;
      const h = 4 + r() * 22;
      g.fillStyle = shade(base, (r() - 0.5) * 0.28);
      g.globalAlpha = 0.55;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x / 40 + i) * 4);
      g.lineTo(W, y + h);
      for (let x = W; x >= 0; x -= 16) g.lineTo(x, y + h + Math.sin(x / 33 + i) * 4);
      g.fill();
    }
  } else if (style === 'craters') {
    for (let i = 0; i < 70; i++) {
      const x = r() * W;
      const y = H * 0.1 + r() * H * 0.8;
      const rad = 3 + Math.pow(r(), 2) * 22;
      g.globalAlpha = 0.6;
      g.fillStyle = shade(base, -0.12);
      g.beginPath();
      g.ellipse(x, y, rad, rad * 0.8, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = shade(base, 0.14);
      g.lineWidth = 1.5;
      g.stroke();
    }
  } else if (style === 'grid') {
    // city blocks: a lattice of lighter streets with darker lots
    for (let y = 0; y < H; y += 16) {
      for (let x = 0; x < W; x += 16) {
        g.globalAlpha = 0.25 + r() * 0.5;
        g.fillStyle = shade(base, (r() - 0.55) * 0.3);
        g.fillRect(x + 2, y + 2, 12, 12);
      }
    }
    g.globalAlpha = 0.5;
    g.strokeStyle = shade(base, 0.25);
    g.lineWidth = 1;
    for (let x = 0; x < W; x += 64) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
    }
  } else if (style === 'swirl') {
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.35;
      g.strokeStyle = shade(base, (r() - 0.4) * 0.35);
      g.lineWidth = 3 + r() * 9;
      const y0 = r() * H;
      const f = 0.01 + r() * 0.02;
      g.beginPath();
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y0 + Math.sin(x * f + i) * 18 + Math.cos(x * f * 2.3) * 8);
      g.stroke();
    }
  } else {
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.5;
      g.fillStyle = shade(base, (r() - 0.5) * 0.32);
      g.beginPath();
      const x = r() * W;
      const y = H * 0.15 + r() * H * 0.7;
      const n = 9;
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2;
        const rr = 10 + r() * 36;
        g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr);
      }
      g.fill();
    }
  }
  // fine grain
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function starfield(count: number, rMin: number, rMax: number, seed = 3): THREE.Points {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = [new THREE.Color('#ffffff'), new THREE.Color('#cfd8ff'), new THREE.Color('#ffe2c4'), new THREE.Color('#d9c8ff')];
  for (let i = 0; i < count; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const rad = rMin + r() * (rMax - rMin);
    const s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(th) * s * rad, u * rad, Math.sin(th) * s * rad], i * 3);
    const c = palette[Math.floor(r() * palette.length)];
    const b = 0.5 + r() * 0.5;
    col.set([c.r * b, c.g * b, c.b * b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 2.2,
    sizeAttenuation: false,
    vertexColors: true,
    map: dotTexture(),
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

/** Rim-light shell for planets: additive glow at the silhouette. */
export function atmosphere(radius: number, color: THREE.ColorRepresentation, strength = 1): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uStrength; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.6); gl_FragColor = vec4(uColor, f * uStrength); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), mat);
}

export interface Palette {
  orbit: THREE.Color;
  orbitOpacity: number;
  starfieldBlending: THREE.Blending;
  starfieldColorMul: number;
  glowBlending: THREE.Blending;
  ambient: number;
  nebulaOpacity: number;
  label: string;
}

export function palette(theme: Theme): Palette {
  return theme === 'dark'
    ? {
        orbit: new THREE.Color('#b9b6ff'),
        orbitOpacity: 0.13,
        starfieldBlending: THREE.AdditiveBlending,
        starfieldColorMul: 1,
        glowBlending: THREE.AdditiveBlending,
        ambient: 0.5,
        nebulaOpacity: 0.55,
        label: '#eceaff',
      }
    : {
        orbit: new THREE.Color('#3b2f8f'),
        orbitOpacity: 0.16,
        starfieldBlending: THREE.NormalBlending,
        starfieldColorMul: 0.32,
        glowBlending: THREE.NormalBlending,
        ambient: 1.0,
        nebulaOpacity: 0.3,
        label: '#17142e',
      };
}

export function currentTheme(): Theme {
  const r = document.documentElement.dataset.themeResolved;
  if (r === 'light' || r === 'dark') return r;
  return 'dark';
}

/** Low DPR on weak GPUs keeps the frame rate up; we lower it further if frames run long. */
export function initialPixelRatio(): number {
  const dpr = window.devicePixelRatio || 1;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) || (navigator.hardwareConcurrency || 8) <= 4;
  return Math.min(dpr, weak ? 1.25 : 2);
}

/**
 * Watches frame times and steps quality down while the median frame is slow:
 * level 1 = pixel ratio 1, level 2 = no bloom, level 3 = 30 fps.
 */
export class FrameGuard {
  private samples: number[] = [];
  level = 0;
  constructor(private onLevel: (level: number) => void) {}
  tick(dt: number) {
    if (this.level >= 3) return;
    this.samples.push(dt);
    if (this.samples.length < 60) return;
    const sorted = [...this.samples].sort((a, b) => a - b);
    this.samples = [];
    if (sorted[30] > 1 / 30) {
      this.level++;
      this.onLevel(this.level);
    } else this.level = 3; // fast enough: stop measuring
  }
}

export const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

// ── visual polish: nebula clouds, city lights, corona, sky, galaxy dust, bloom ──

/** Soft cloudy nebula made of many overlapping radial puffs. */
export function nebulaTexture(rgb: [number, number, number], seed: number): THREE.Texture {
  const [c, g] = canvas(256, 256);
  const r = rng(seed);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 0.8) * 85;
    const x = 128 + Math.cos(a) * d;
    const y = 128 + Math.sin(a) * d * 0.7;
    const rad = 20 + r() * 60;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const k = 0.035 + r() * 0.05;
    const tint = [rgb[0] + (r() - 0.5) * 60, rgb[1] + (r() - 0.5) * 60, rgb[2] + (r() - 0.5) * 40].map((v) => Math.max(0, Math.min(255, v | 0)));
    grd.addColorStop(0, `rgba(${tint.join(',')},${k})`);
    grd.addColorStop(1, `rgba(${tint.join(',')},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
  }
  // blur away the gradient dithering, which shows up as a dot grid when the sprite is scaled up
  const [c2, g2] = canvas(256, 256);
  g2.filter = 'blur(5px)';
  g2.drawImage(c, 0, 0);
  g.globalCompositeOperation = 'copy';
  g.drawImage(c2, 0, 0);
  // fade the square edges out
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(128, 128, 60, 128, 128, 128);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Emissive map: clusters of tiny lights, so the night side of a planet glitters. */
export function cityLightsTexture(seed: number, size = 512): THREE.Texture {
  const W = size;
  const H = size / 2;
  const [c, g] = canvas(W, H);
  const r = rng(seed * 53 + 7);
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  for (let k = 0; k < 16; k++) {
    const cx = r() * W;
    const cy = H * 0.15 + r() * H * 0.7;
    const n = 20 + r() * 60;
    for (let i = 0; i < n; i++) {
      const x = cx + (r() - 0.5) * 60 * r();
      const y = cy + (r() - 0.5) * 30 * r();
      g.fillStyle = `rgba(255,${200 + r() * 55},${150 + r() * 80},${0.5 + r() * 0.5})`;
      g.fillRect(x, y, r() < 0.85 ? 1 : 2, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Thin radial rays around the star; rotated slowly behind it. */
export function coronaTexture(): THREE.Texture {
  const [c, g] = canvas(512, 512);
  const r = rng(9);
  g.translate(256, 256);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2;
    const len = 120 + r() * 136;
    const w = 0.01 + r() * 0.03;
    const grd = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    grd.addColorStop(0, 'rgba(255,214,140,0.5)');
    grd.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len);
    g.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Full-screen sky gradient (scene.background), matching --space-grad in CSS. */
export function skyTexture(theme: Theme): THREE.Texture {
  const [c, g] = canvas(64, 256);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  if (theme === 'dark') {
    grd.addColorStop(0, '#03040b');
    grd.addColorStop(0.45, '#0b0c24');
    grd.addColorStop(0.75, '#121238');
    grd.addColorStop(1, '#06071a');
  } else {
    grd.addColorStop(0, '#cfc6f7');
    grd.addColorStop(0.5, '#e6defc');
    grd.addColorStop(1, '#d3dcfa');
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A spiral disc of dust and stars on the galaxy plane, brighter towards the core. */
export function galaxyDust(count: number, inner: number, outer: number, seed = 21, colors: [string, string, string, string] = ['#ffc98a', '#b18cff', '#5fa8ff', '#ff7ac8']): THREE.Points {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const [core, mid, rim, pink] = colors.map((c) => new THREE.Color(c));
  const ARMS = 3;
  for (let i = 0; i < count; i++) {
    const t = Math.pow(r(), 0.85);
    const d = inner + t * (outer - inner);
    const arm = i % ARMS;
    const spread = (r() - 0.5) * (0.5 + t * 0.9) + (r() - 0.5) * 0.25;
    const a = d * 0.085 + (arm / ARMS) * Math.PI * 2 + spread;
    const y = (r() - 0.5) * (1 - t) * 3.2 + (r() - 0.5) * 0.6;
    pos.set([Math.cos(a) * d, y - 1.2, Math.sin(a) * d], i * 3);
    const c = t < 0.35 ? core.clone().lerp(mid, t / 0.35) : mid.clone().lerp(r() < 0.25 ? pink : rim, (t - 0.35) / 0.65);
    const b = 0.45 + r() * 0.55;
    col.set([c.r * b, c.g * b, c.b * b], i * 3);
    size[i] = r() < 0.03 ? 2.4 + r() * 2 : 0.6 + r() * 1.1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 }, uOpacity: { value: 0.85 }, uMap: { value: dotTexture() } },
    vertexShader: /* glsl */ `
      attribute float size; varying vec3 vColor; uniform float uScale;
      void main(){ vColor = color; vec4 mv = modelViewMatrix*vec4(position,1.0);
        gl_PointSize = size * uScale * (60.0 / -mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uOpacity; varying vec3 vColor;
      void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vColor, t.a*uOpacity); }`,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

/** Upload textures to the GPU a few at a time, so the first frame doesn't do it all at once. */
export async function uploadTextures(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const seen = new Set<THREE.Texture>();
  scene.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      for (const v of Object.values(m as unknown as Record<string, unknown>)) if (v instanceof THREE.Texture) seen.add(v);
      const u = (m as THREE.ShaderMaterial).uniforms;
      if (u) for (const x of Object.values(u)) if (x.value instanceof THREE.Texture) seen.add(x.value);
    }
  });
  if (scene.background instanceof THREE.Texture) seen.add(scene.background);
  let n = 0;
  for (const t of seen) {
    renderer.initTexture(t);
    if (++n % 4 === 0) await yieldToMain();
  }
}
