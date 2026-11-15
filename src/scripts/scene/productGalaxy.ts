// The Product Galaxy: products built on the kits ("Built with Kition"). It sits
// next to the KHP galaxy on the same canvas. The Kition SDK is its star, the
// four delivery forms are its rings, every product is a settlement of the same
// size, and light cables run back to the kit planets each product uses.
import * as THREE from 'three';
import { atmosphere, galaxyDust, glowTexture, rng, type Theme } from './common';
import { planetBody, type PlanetBody } from './planetSurface';
import type { ProductGalaxyData, ScenePlanet } from './types';

export type ProductKind = 'sdk' | 'delivery' | 'product' | 'addproduct';

export interface ProductGalaxyCtx {
  scene: THREE.Scene;
  data: ProductGalaxyData;
  planets: ScenePlanet[];
  theme: Theme;
  small: boolean;
  mkLabel: (kind: ProductKind, id: string, html: string, aria: string, style?: string) => HTMLButtonElement;
  addTarget: (t: { kind: ProductKind; id: string; object: THREE.Object3D; hit: THREE.Object3D[]; label: HTMLButtonElement; radius: number; labelOffset: number }) => void;
  /** world position just above a kit planet (the KHP galaxy turns, so this moves) */
  kitWorld: (id: string, out: THREE.Vector3) => THREE.Vector3;
}

const RING_COLORS: Record<string, string> = { embed: '#5fd4ff', script: '#a99bff', headless: '#7dffb2', mcp: '#ffb86b' };
const RINGS = [11, 15.5, 20, 24.5];

const lineVert = /* glsl */ `attribute float u; varying float vU; void main(){ vU = u; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

export function productGalaxy(ctx: ProductGalaxyCtx) {
  const { data } = ctx;
  const center = new THREE.Vector3(...data.position);
  const root = new THREE.Group();
  root.position.copy(center);
  ctx.scene.add(root);
  const spin = new THREE.Group(); // the disc turns slowly, like the KHP galaxy
  root.add(spin);
  const glowBlend = () => (ctx.theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending);

  // ── dust and disc glow, in sea-green and cyan so the two galaxies read apart ──
  const dust = galaxyDust(ctx.small ? 3400 : 7600, 5, 46, 57, ['#e6fffa', '#4fe0cf', '#5fa8ff', '#ff9ad5']);
  spin.add(dust);
  const dustMat = dust.material as THREE.ShaderMaterial;
  dustMat.uniforms.uScale.value = 1.35;
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 110),
    new THREE.MeshBasicMaterial({ map: glowTexture('rgba(80,220,210,1)', 'rgba(80,220,210,0)'), transparent: true, depthWrite: false, opacity: 0.11, blending: THREE.AdditiveBlending }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -1.5;
  root.add(disc);

  // ── the star: Kition SDK ─────────────────────────────────────────────
  const coreUniforms = { uTime: { value: 0 } };
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(3.3, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: coreUniforms,
      vertexShader: /* glsl */ `varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
        float n3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){
          vec3 p = normalize(vP)*3.0;
          float n = n3(p + vec3(uTime*0.15, 0.0, uTime*0.1))*0.6 + n3(p*2.3 - uTime*0.2)*0.4;
          // a faint lattice: the SDK is built, not burning
          vec3 q = abs(fract(normalize(vP)*6.0) - 0.5);
          float grid = smoothstep(0.46, 0.5, max(q.x, max(q.y, q.z)));
          vec3 c = mix(vec3(0.05,0.45,0.55), vec3(0.45,0.95,1.0), smoothstep(0.3,0.85,n));
          c += vec3(0.55,1.0,1.0)*grid*0.45;
          float rim = pow(1.0 - max(dot(vN,vV),0.0), 2.0);
          gl_FragColor = vec4(c*0.72 + vec3(0.3,0.9,1.0)*rim*0.55, 1.0);
        }`,
    }),
  );
  root.add(core);
  const glows = [
    { s: 24, o: 0.22, c: 'rgba(70,215,235,1)' },
    { s: 10, o: 0.42, c: 'rgba(170,250,255,1)' },
  ].map(({ s, o, c }) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(c, c.replace(',1)', ',0)')), transparent: true, depthWrite: false, opacity: o, blending: glowBlend() }));
    sp.scale.setScalar(s);
    sp.userData.base = o;
    root.add(sp);
    return sp;
  });
  // a slow wireframe shell around the core
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(5.2, 1)),
    new THREE.LineBasicMaterial({ color: '#8ff4ff', transparent: true, opacity: 0.35, depthWrite: false }),
  );
  root.add(shell);
  ctx.addTarget({
    kind: 'sdk',
    id: 'sdk',
    object: core,
    hit: [core],
    radius: 3.3,
    labelOffset: 1.7,
    label: ctx.mkLabel('sdk', 'sdk', `<span class="n">${data.sdk.name}</span><span class="k">${data.name} · ${data.sdk.license}</span>`, `${data.sdk.name}: ${data.sdk.body}`),
  });

  // ── four rings: the delivery forms ───────────────────────────────────
  const ringUniforms = { uTime: { value: 0 } };
  const rings = data.delivery.map((d, i) => {
    const R = RINGS[i] ?? 11 + i * 4.5;
    const g = new THREE.Group();
    g.rotation.set(0.05 * (i % 2 ? 1 : -1), 0, 0.04 * (i - 1.5));
    root.add(g);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: ringUniforms.uTime, uColor: { value: new THREE.Color(RING_COLORS[d.id] || '#8ff4ff') }, uAlpha: { value: 0.7 }, uDir: { value: i % 2 ? -1 : 1 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uColor; uniform float uAlpha; uniform float uDir; varying vec2 vUv;
        void main(){ float d = fract(vUv.x*${36 + i * 10}.0 - uTime*0.35*uDir); float a = smoothstep(0.0,0.2,d)*smoothstep(0.75,0.4,d);
          gl_FragColor = vec4(uColor, (0.18 + a*0.82)*uAlpha); }`,
      transparent: true,
      depthWrite: false,
      blending: glowBlend(),
    });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 6, 256), mat);
    torus.rotation.x = -Math.PI / 2;
    g.add(torus);
    const hit = new THREE.Mesh(new THREE.TorusGeometry(R, 0.9, 4, 96), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    hit.rotation.x = -Math.PI / 2;
    g.add(hit);
    // labels sit in one row across the rings at the front right of the view, like a
    // legend; update() keeps them there as the camera moves
    const anchor = new THREE.Object3D();
    g.add(anchor);
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: RING_COLORS[d.id], transparent: true, depthWrite: false, blending: glowBlend() }));
    dot.scale.setScalar(1.6);
    g.add(dot);
    ctx.addTarget({
      kind: 'delivery',
      id: d.id,
      object: anchor,
      hit: [hit],
      radius: 0.4,
      labelOffset: 0,
      label: ctx.mkLabel('delivery', d.id, `<span class="n">${d.name}</span>`, `${data.sdk.name} · ${d.name}: ${d.body}`, `--kit:${RING_COLORS[d.id]}`),
    });
    return { g, mat, dot, anchor, R, i };
  });

  // ── settlements: one per product, all the same size ─────────────────
  const kitColor = new Map(ctx.planets.map((p) => [p.id, p.color.dark]));
  const settlements: { id: string; g: THREE.Group; beacon?: THREE.Mesh; body: PlanetBody; air: THREE.Mesh; dock: THREE.Group; cables: Cable[]; hover: number }[] = [];
  const PRODUCT_R = 2.4;
  interface Cable {
    kit: string;
    line: THREE.Line;
    pos: Float32Array;
    mat: THREE.ShaderMaterial;
    curve: THREE.QuadraticBezierCurve3;
  }
  const SEG = 64;
  const uAttr = new Float32Array(SEG).map((_, i) => i / (SEG - 1));
  const cableUniforms = { uTime: { value: 0 } };
  const golden = Math.PI * (3 - Math.sqrt(5));
  data.products.forEach((p, i) => {
    // first one faces the KHP galaxy; the rest follow a golden-angle spiral outwards
    const a = Math.PI + i * golden;
    const d = 17.5 + i * 2.2;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * d, 3 + (i % 3) * 1.2, Math.sin(a) * d);
    root.add(g);
    // a product is a planet: the look and colour its maker chose, always the same size as every other product
    const body = planetBody(
      { id: p.id, name: p.name, nick: '', cluster: '', status: '', ship: '', href: p.href, color: { light: p.planet.color, dark: p.planet.color }, surface: { style: 'patches', look: p.planet.look, ring: p.planet.ring, moons: p.planet.moons } },
      i + 41, ctx.theme, PRODUCT_R, { size: false },
    );
    g.add(body.group);
    const air = atmosphere(PRODUCT_R * 1.14, p.planet.color, 0.8);
    g.add(air);
    // a small dock in orbit, lit in the colours of the kits the product uses
    const dock = new THREE.Group();
    dock.rotation.set(0.5, 0, 0.25);
    g.add(dock);
    const kits = p.kits.length ? p.kits : ['note'];
    const N = Math.min(16, Math.max(6, kits.length));
    const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), new THREE.MeshBasicMaterial({ color: '#ffffff' }), N);
    const m4 = new THREE.Matrix4();
    for (let k = 0; k < N; k++) {
      const wa = (k / N) * Math.PI * 2;
      m4.compose(new THREE.Vector3(Math.cos(wa) * PRODUCT_R * 1.55, 0, Math.sin(wa) * PRODUCT_R * 1.55), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -wa, 0)), new THREE.Vector3(1, 1, 1));
      windows.setMatrixAt(k, m4);
      windows.setColorAt(k, new THREE.Color(kitColor.get(kits[k % kits.length]) || '#ffffff'));
    }
    dock.add(windows);
    let beacon: THREE.Mesh | undefined;
    if (p.pick) {
      beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: '#fff2a8' }));
      beacon.position.y = PRODUCT_R + 1.1;
      g.add(beacon);
    }
    const hit = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    g.add(hit);

    // cables back to every kit planet the product uses: data flows from the kit to the product
    const cables: Cable[] = kits.map((kit) => {
      const pos = new Float32Array(SEG * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('u', new THREE.BufferAttribute(uAttr, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: cableUniforms.uTime, uColor: { value: new THREE.Color(kitColor.get(kit) || '#ffffff') }, uAlpha: { value: 0.35 }, uPhase: { value: Math.random() } },
        vertexShader: lineVert,
        fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uColor; uniform float uAlpha; uniform float uPhase; varying float vU;
          void main(){ float d = fract(vU*5.0 - uTime*0.22 + uPhase); float pulse = smoothstep(0.0,0.08,d)*smoothstep(0.3,0.1,d);
            float ends = smoothstep(0.0,0.06,vU)*smoothstep(1.0,0.94,vU);
            gl_FragColor = vec4(uColor, (0.22 + pulse*0.9)*uAlpha*ends); }`,
        transparent: true,
        depthWrite: false,
        blending: glowBlend(),
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      ctx.scene.add(line);
      return { kit, line, pos, mat, curve: new THREE.QuadraticBezierCurve3() };
    });

    const tag = p.statusLabel ? `${p.statusLabel} · ` : p.byKition ? 'by Kition · ' : '';
    ctx.addTarget({
      kind: 'product',
      id: p.id,
      object: g,
      hit: [hit],
      radius: 2.2,
      labelOffset: 1.35,
      label: ctx.mkLabel('product', p.id, `<span class="n">${p.name}</span><span class="k">${tag}${p.kits.length} kits</span>`, `${p.name}: ${p.tagline}`),
    });
    settlements.push({ id: p.id, g, beacon, body, air, dock, cables, hover: 0 });
  });

  // ── "your product here": a wireframe settlement waiting to be built ──
  const add = new THREE.Group();
  {
    const n = data.products.length;
    const a = Math.PI + n * golden;
    const d = 17.5 + n * 2.2;
    add.position.set(Math.cos(a) * d, 3.5, Math.sin(a) * d);
  }
  root.add(add);
  const addMat = new THREE.LineBasicMaterial({ color: '#8ff4ff', transparent: true, opacity: 0.75, depthWrite: false });
  const addFrame = new THREE.Group();
  addFrame.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 6)), addMat));
  const addRing = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TorusGeometry(2.1, 0.22, 4, 24)), addMat);
  addRing.rotation.x = Math.PI / 2;
  addFrame.add(addRing);
  add.add(addFrame);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 1.6, 9, 24, 1, true),
    new THREE.ShaderMaterial({
      uniforms: { uTime: coreUniforms.uTime },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `uniform float uTime; varying vec2 vUv;
        void main(){ float s = fract(vUv.y*3.0 - uTime*0.6); float a = (1.0 - vUv.y)*0.35 + smoothstep(0.9,1.0,s)*0.25;
          gl_FragColor = vec4(0.55,0.95,1.0, a*(1.0 - vUv.y)); }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: glowBlend(),
    }),
  );
  beam.position.y = -4.5;
  add.add(beam);
  const addHit = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
  add.add(addHit);
  ctx.addTarget({
    kind: 'addproduct',
    id: 'add',
    object: add,
    hit: [addHit],
    radius: 2.2,
    labelOffset: 1.35,
    label: ctx.mkLabel('addproduct', 'add', `<span class="n">+ ${data.add.name}</span><span class="k">${data.add.cta}</span>`, `${data.add.title}: ${data.add.body}`),
  });

  // couriers: little lights travelling a cable from a kit to a product
  const allCables = settlements.flatMap((s) => s.cables);
  const sr = rng(91);
  const couriers = allCables.length
    ? Array.from({ length: ctx.small ? 3 : 5 }, () => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: glowBlend() }));
        sp.scale.setScalar(1.3);
        ctx.scene.add(sp);
        return { sp, c: allCables[Math.floor(sr() * allCables.length)], t: sr(), dur: 7 + sr() * 5 };
      })
    : [];

  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const mid = new THREE.Vector3();
  return {
    center,
    root,
    update(dt: number, elapsed: number, motion: number, hovered: { kind: string; id: string } | null, camera: THREE.Camera, target: THREE.Vector3) {
      const nearby=camera.position.distanceTo(center)<300 && target.distanceTo(center)<100;
      rings.forEach(r=>r.g.visible=nearby);settlements.forEach(s=>s.g.visible=nearby);add.visible=nearby;shell.visible=nearby;
      const view = Math.atan2(camera.position.z - center.z, camera.position.x - center.x);
      for (const r of rings) {
        const a = view - Math.PI * (0.44 - r.i * 0.1);
        r.anchor.position.set(Math.cos(a) * r.R, 0.6, Math.sin(a) * r.R);
        r.dot.position.set(Math.cos(a) * r.R, 0, Math.sin(a) * r.R);
      }
      coreUniforms.uTime.value = elapsed;
      ringUniforms.uTime.value = elapsed * motion;
      cableUniforms.uTime.value = elapsed * (motion || 0.0001);
      spin.rotation.y += dt * 0.01 * motion;
      shell.rotation.y += dt * 0.08 * motion;
      shell.rotation.x += dt * 0.03 * motion;
      glows.forEach((g, i) => ((g.material as THREE.SpriteMaterial).opacity = g.userData.base * (1 + Math.sin(elapsed * (1.1 + i)) * 0.07 * motion)));
      addFrame.rotation.y += dt * 0.3 * motion;
      addMat.opacity = 0.45 + Math.sin(elapsed * 2.2) * 0.25 * (motion || 0);
      const anyHot = hovered?.kind === 'product';
      for (const s of settlements) {
        s.body.surface.rotation.y += dt * 0.07 * motion;
        s.dock.rotation.y += dt * 0.25 * motion;
        if (nearby) s.body.update(dt, elapsed, motion, center);
        if (s.beacon) s.beacon.visible = Math.sin(elapsed * 2.4) > -0.3 || !motion;
        const hot = anyHot && hovered!.id === s.id;
        s.hover += ((hot ? 1 : 0) - s.hover) * Math.min(1, dt * 8);
        s.g.scale.setScalar(1 + s.hover * 0.1);
        s.g.getWorldPosition(tmpB);
        for (const c of s.cables) {
          c.line.visible=nearby;
          if(!nearby) continue;
          ctx.kitWorld(c.kit, tmpA);
          mid.copy(tmpA).lerp(tmpB, 0.5);
          mid.y += 16 + tmpA.distanceTo(tmpB) * 0.12;
          c.curve.v0.copy(tmpA);
          c.curve.v1.copy(mid);
          c.curve.v2.copy(tmpB);
          for (let k = 0; k < SEG; k++) {
            c.curve.getPoint(k / (SEG - 1), tmpA);
            c.pos[k * 3] = tmpA.x;
            c.pos[k * 3 + 1] = tmpA.y;
            c.pos[k * 3 + 2] = tmpA.z;
          }
          (c.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
          c.mat.uniforms.uAlpha.value = anyHot ? (hot ? 1 : 0.08) : 0.2;
        }
      }
      for (const c of couriers) {
        c.t += (dt / c.dur) * motion;
        if (c.t >= 1) {
          c.t = 0;
          c.c = allCables[Math.floor(sr() * allCables.length)];
          c.dur = 7 + sr() * 5;
        }
        c.c.curve.getPoint(c.t, c.sp.position);
        (c.sp.material as THREE.SpriteMaterial).color.copy(c.c.mat.uniforms.uColor.value);
        c.sp.visible = nearby && motion > 0;
      }
    },
    setTheme(theme: Theme) {
      ctx.theme = theme;
      const b = glowBlend();
      dustMat.uniforms.uOpacity.value = theme === 'dark' ? 0.85 : 0.5;
      dustMat.blending = theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
      dustMat.needsUpdate = true;
      (disc.material as THREE.MeshBasicMaterial).opacity = theme === 'dark' ? 0.11 : 0.07;
      const mats: THREE.Material[] = [...glows.map((g) => g.material), ...rings.map((r) => r.mat), ...rings.map((r) => r.dot.material), ...allCables.map((c) => c.mat), beam.material as THREE.Material, ...couriers.map((c) => c.sp.material)];
      for (const m of mats) {
        m.blending = b;
        m.needsUpdate = true;
      }
      for (const st of settlements) {
        st.body.setTheme(theme);
        (st.air.material as THREE.ShaderMaterial).uniforms.uStrength.value = theme === 'dark' ? 0.8 : 0.4;
      }
      addMat.color.set(theme === 'dark' ? '#8ff4ff' : '#0f8f9c');
      (shell.material as THREE.LineBasicMaterial).color.set(theme === 'dark' ? '#8ff4ff' : '#0f8f9c');
    },
  };
}
