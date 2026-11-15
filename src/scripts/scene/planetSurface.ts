// Kit planets as real little worlds. Each planet has a "look" (an ocean world,
// a gas giant, a cratered rock, a storm, a city grid, lava, ice, dunes) drawn
// by one shader from 3D noise, so there is no seam and no pinching at the
// poles. The surface has relief (the normal is bent by the height field), a day
// and a night side lit from the star, lights or glowing cracks in the dark,
// highlights on water and ice, and a rim of air in the kit colour. Around it:
// drifting clouds, rings that the planet casts a shadow on, and moons.
import * as THREE from 'three';
import { planetTexture, shade, type Theme } from './common';
import type { ScenePlanet } from './types';

export type Look = 'terra' | 'gas' | 'rock' | 'storm' | 'city' | 'lava' | 'ice' | 'dunes';
const LOOKS: Look[] = ['terra', 'gas', 'rock', 'storm', 'city', 'lava', 'ice', 'dunes'];
// what a planet looks like when the data only gives the old texture style
const FROM_STYLE: Record<string, Look> = { bands: 'gas', craters: 'rock', grid: 'city', swirl: 'storm', patches: 'terra' };

const NOISE = /* glsl */ `
  float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  vec3 hash3(vec3 p){ return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }
  float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0 - 2.0*f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i = 0; i < 5; i++){ s += a*noise(p); p = p*2.02 + vec3(13.1, 7.7, 3.3); a *= 0.5; } return s; }
  // nearest and second nearest cell centre, and an id for the nearest cell
  vec3 cells(vec3 x){ vec3 i = floor(x), f = fract(x); float d1 = 8.0, d2 = 8.0, id = 0.0;
    for(int a = -1; a <= 1; a++) for(int b = -1; b <= 1; b++) for(int c = -1; c <= 1; c++){
      vec3 g = vec3(float(a), float(b), float(c)); float d = length(g + hash3(i + g) - f);
      if(d < d1){ d2 = d1; d1 = d; id = hash(i + g + 7.0); } else if(d < d2) d2 = d; }
    return vec3(d1, d2, id); }
`;

const VERT = /* glsl */ `
  varying vec3 vObj; varying vec3 vWorldP; varying mat3 vRot;
  void main(){
    vObj = position;
    vRot = mat3(modelMatrix);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorldP = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const FRAG = /* glsl */ `
  uniform int uLook; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uLight;
  uniform float uTime; uniform float uSeed; uniform float uAmbient; uniform float uSun; uniform float uGlow; uniform float uRim; uniform float uBump;
  varying vec3 vObj; varying vec3 vWorldP; varying mat3 vRot;
  ${NOISE}
  // set by relief(): what the colouring needs besides the height
  float gRaw; float gAux; vec2 gUV;

  // How high the ground is at a point of the unit sphere: this bends the normal, which is what makes the surface read as solid.
  float relief(vec3 d){
    vec3 p = d * 1.6 + uSeed;
    gRaw = 0.0; gAux = 0.0; gUV = vec2(0.0);
    if(uLook == 0){ // terra: land above the waterline, flat seas
      gRaw = fbm(p * 1.7);
      return max(gRaw, 0.5) + fbm(p * 7.0) * 0.06 * step(0.5, gRaw);
    }
    if(uLook == 1) return 0.0; // gas: no ground at all
    if(uLook == 2){ // rock: rough ground with craters (a bowl and a raised rim)
      vec3 c = cells(p * 2.3);
      float crater = step(c.z, 0.55);
      float bowl = mix(1.0, smoothstep(0.0, 0.34, c.x), crater);
      float rim = crater * smoothstep(0.3, 0.38, c.x) * (1.0 - smoothstep(0.38, 0.5, c.x));
      gRaw = fbm(p * 3.2); gAux = rim;
      return gRaw * 0.55 + bowl * 0.4 + rim * 0.3;
    }
    if(uLook == 3){ // storm: clouds folded over themselves
      vec3 q = p + 1.25 * vec3(fbm(p + 1.7 + uTime * 0.012), fbm(p + 5.2), fbm(p + 9.1 - uTime * 0.008));
      gRaw = fbm(q * 1.4);
      return gRaw;
    }
    if(uLook == 4){ // city: blocks between streets, laid out on the faces of a cube
      vec3 a = abs(d); vec2 uv; float face;
      if(a.x >= a.y && a.x >= a.z){ uv = d.yz / a.x; face = 1.0 + step(0.0, d.x); }
      else if(a.y >= a.z){ uv = d.xz / a.y; face = 3.0 + step(0.0, d.y); }
      else { uv = d.xy / a.z; face = 5.0 + step(0.0, d.z); }
      vec2 g = uv * 6.0 + 0.5; vec2 f = fract(g);
      float street = 1.0 - step(0.09, f.x) * step(0.09, f.y) * step(f.x, 0.91) * step(f.y, 0.91);
      gRaw = hash(vec3(floor(g), face + uSeed)); gAux = street; gUV = g + face * 17.0;
      return street > 0.5 ? 0.0 : 0.35 + 0.65 * gRaw;
    }
    if(uLook == 5){ // lava: a dark crust split by glowing cracks
      float r = 1.0 - abs(2.0 * fbm(p * 2.1) - 1.0);
      gAux = r; gRaw = fbm(p * 5.0);
      return 1.0 - pow(r, 4.0) + gRaw * 0.15;
    }
    if(uLook == 6){ // ice: facets with bright seams
      vec3 c = cells(p * 2.7);
      gRaw = c.z; gAux = 1.0 - smoothstep(0.0, 0.07, c.y - c.x);
      return c.z * 0.55 + smoothstep(0.0, 0.14, c.y - c.x) * 0.45;
    }
    // dunes: long ridges that wander
    float w = fbm(p * 1.2);
    gRaw = pow(0.5 + 0.5 * sin(dot(p, vec3(0.5, 3.4, 0.7)) * 2.6 + w * 7.0), 0.6);
    return gRaw + fbm(p * 9.0) * 0.05;
  }

  void main(){
    vec3 d = normalize(vObj);
    vec3 p = d * 1.6 + uSeed;
    // the slope of the ground along two directions on the sphere bends the normal
    vec3 t1 = normalize(cross(d, vec3(0.0, 1.0, 0.0) + d.zxy * 0.001));
    vec3 t2 = cross(d, t1);
    const float E = 0.012;
    float h1 = relief(normalize(d + t1 * E));
    float h2 = relief(normalize(d + t2 * E));
    float h0 = relief(d);
    vec3 nObj = normalize(d - uBump * ((h1 - h0) / E * t1 + (h2 - h0) / E * t2));
    vec3 N = normalize(vRot * nObj);
    vec3 G = normalize(vRot * d); // the smooth sphere, for the terminator and the rim
    vec3 L = normalize(uLight - vWorldP);
    vec3 V = normalize(cameraPosition - vWorldP);
    float day = smoothstep(-0.22, 0.3, dot(G, L));
    float night = 1.0 - day;

    vec3 alb = uB; vec3 emi = vec3(0.0); float spec = 0.0; float shine = 40.0;
    if(uLook == 0){
      float land = smoothstep(0.5, 0.525, gRaw);
      vec3 sea = mix(uA * 0.45, uB * 0.6, smoothstep(0.22, 0.5, gRaw));
      vec3 ground = mix(uB, uC, smoothstep(0.55, 0.78, gRaw));
      ground *= 0.8 + 0.4 * fbm(p * 6.0);
      float cap = smoothstep(0.74, 0.82, abs(d.y) + (fbm(p * 3.0) - 0.5) * 0.18);
      alb = mix(mix(sea, ground, land), vec3(0.78, 0.83, 0.9), cap);
      spec = (1.0 - land) * (1.0 - cap) * 0.5; shine = 110.0;
      // towns on the night side
      emi = vec3(1.0, 0.82, 0.5) * land * (1.0 - cap) * step(0.7, noise(p * 40.0)) * smoothstep(0.42, 0.6, fbm(p * 5.0 + 3.0)) * night * 1.7 * uGlow;
    } else if(uLook == 1){
      float lat = d.y + (fbm(p * vec3(1.4, 4.0, 1.4)) - 0.5) * 0.24;
      float b = sin(lat * (11.0 + fract(uSeed) * 7.0)) * 0.5 + 0.5;
      float fine = fbm(vec3(p.x * 0.8, lat * 9.0, p.z * 0.8));
      alb = mix(uA, uB, b);
      alb = mix(alb, uC, smoothstep(0.52, 0.82, fine) * 0.65);
      // one long-lived storm
      vec3 sd = normalize(vec3(cos(uSeed * 3.0), -0.28, sin(uSeed * 3.0)));
      vec3 dd = (d - sd) * vec3(1.0, 2.0, 1.0);
      float s = 1.0 - smoothstep(0.05, 0.3, length(dd));
      alb = mix(alb, uC * 1.15, s * (0.55 + 0.45 * sin(length(dd) * 46.0 - uTime * 0.6)));
    } else if(uLook == 2){
      alb = mix(uA, uB, smoothstep(0.25, 1.05, h0)) * (0.72 + 0.5 * fbm(p * 8.0));
      alb = mix(alb, uC, gAux * 0.55);
    } else if(uLook == 3){
      alb = mix(uA, uB, smoothstep(0.25, 0.55, gRaw));
      alb = mix(alb, uC, smoothstep(0.58, 0.8, gRaw));
      alb += vec3(0.16) * smoothstep(0.78, 0.92, gRaw);
      spec = 0.15;
    } else if(uLook == 4){
      float street = gAux;
      alb = mix(mix(uA * 0.4, uB * 0.5, gRaw), uA * 0.3, street);
      vec2 w = fract(gUV * 5.0);
      float windows = (1.0 - street) * step(0.55, hash(vec3(floor(gUV * 5.0), 3.0))) * step(0.25, w.x) * step(0.25, w.y);
      emi = uB * street * (0.35 + 1.1 * night) * uGlow + vec3(1.0, 0.86, 0.6) * windows * night * 1.3 * uGlow;
      spec = (1.0 - street) * 0.35; shine = 20.0;
    } else if(uLook == 5){
      alb = mix(uA * 0.22, uA * 0.6, gRaw);
      float r = gAux;
      emi = mix(uB, vec3(1.0, 0.9, 0.6), pow(r, 16.0) * 0.7) * pow(r, 9.0) * (0.95 + 0.2 * sin(uTime * 0.8 + gRaw * 20.0)) * max(uGlow, 0.45);
    } else if(uLook == 6){
      alb = mix(uB * 0.7, mix(uB, vec3(0.8, 0.9, 0.96), 0.6), gRaw * 0.7 + 0.1);
      emi = uC * gAux * (0.25 + 0.6 * night) * uGlow;
      spec = 0.85; shine = 70.0;
    } else {
      alb = mix(uA, uB, gRaw);
      alb = mix(alb, uC, smoothstep(0.75, 1.0, gRaw) * 0.55);
    }

    float ndl = max(dot(N, L), 0.0);
    vec3 col = alb * (uAmbient + uSun * ndl * smoothstep(-0.12, 0.12, dot(G, L)));
    col += vec3(1.0, 0.96, 0.88) * spec * pow(max(dot(N, normalize(L + V)), 0.0), shine) * 0.5 * day;
    // air: a rim in the kit colour, brighter on the lit side
    float fr = pow(1.0 - max(dot(G, V), 0.0), 3.0);
    col += uB * fr * (0.18 + 0.6 * day) * uRim;
    col += emi;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

const CLOUD_FRAG = /* glsl */ `
  uniform vec3 uLight; uniform float uTime; uniform float uSeed; uniform float uAmbient; uniform float uSun; uniform float uCover;
  varying vec3 vObj; varying vec3 vWorldP; varying mat3 vRot;
  ${NOISE}
  void main(){
    vec3 d = normalize(vObj);
    vec3 p = d * 2.4 + uSeed + vec3(uTime * 0.01, 0.0, uTime * 0.006);
    float c = fbm(p + 0.6 * vec3(fbm(p * 2.0), 0.0, fbm(p * 2.0 + 4.0)));
    float a = smoothstep(uCover, uCover + 0.2, c);
    vec3 G = normalize(vRot * d);
    float lit = uAmbient + uSun * max(dot(G, normalize(uLight - vWorldP)), 0.0);
    gl_FragColor = vec4(vec3(0.8, 0.83, 0.88) * lit, a * 0.85);
    #include <colorspace_fragment>
  }`;

const RING_VERT = /* glsl */ `
  varying vec3 vP; varying vec3 vW;
  void main(){ vP = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const RING_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uLight; uniform vec3 uCenter; uniform float uInner; uniform float uWidth; uniform float uR; uniform float uAlpha;
  varying vec3 vP; varying vec3 vW;
  void main(){
    float t = clamp((length(vP.xy) - uInner) / uWidth, 0.0, 1.0);
    float bands = 0.5 + 0.5 * sin(t * 52.0) * sin(t * 13.0 + 1.3);
    float gap = smoothstep(0.02, 0.06, abs(t - 0.58));
    float edge = smoothstep(0.0, 0.07, t) * smoothstep(1.0, 0.86, t);
    // the planet's shadow falls across the ring on the side away from the star
    vec3 toL = normalize(uLight - vW); vec3 oc = uCenter - vW;
    float along = dot(oc, toL);
    float shadow = along > 0.0 ? smoothstep(uR * 0.9, uR * 1.04, length(oc - toL * along)) : 1.0;
    vec3 c = mix(uColor, vec3(1.0), 0.18 + 0.2 * sin(t * 9.0)) * (0.25 + 0.75 * shadow);
    gl_FragColor = vec4(c, (0.25 + 0.75 * bands) * gap * edge * uAlpha);
    #include <colorspace_fragment>
  }`;

export interface PlanetBody {
  /** everything of the planet; put it where the planet goes */
  group: THREE.Group;
  /** the globe itself: spin it, raycast it, stand things on it */
  surface: THREE.Mesh;
  radius: number;
  look: Look;
  /** `light`: where the star is, in world space */
  update(dt: number, time: number, motion: number, light: THREE.Vector3): void;
  setTheme(theme: Theme): void;
}

const hue = (hex: string, turn: number, lightness = 0) => {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.setHSL((hsl.h + turn + 1) % 1, hsl.s, THREE.MathUtils.clamp(hsl.l + lightness, 0.05, 0.95));
};

export function planetBody(p: ScenePlanet, seed: number, theme: Theme, baseRadius: number, opts: { moons?: boolean; size?: boolean } = {}): PlanetBody {
  const s = p.surface;
  const look: Look = (s.look as Look) || FROM_STYLE[s.style] || 'terra';
  const radius = baseRadius * (opts.size === false ? 1 : s.size ?? 1);
  const group = new THREE.Group();
  const uLight = { value: new THREE.Vector3() };
  const uTime = { value: 0 };
  const light = { uAmbient: { value: 0.16 }, uSun: { value: 0.82 } };

  const main = p.color.dark;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uLook: { value: LOOKS.indexOf(look) },
      uA: { value: new THREE.Color(shade(main, -0.42)) },
      uB: { value: new THREE.Color(main) },
      // a neighbouring hue, lighter: the second colour every planet needs to not look flat
      uC: { value: hue(main, look === 'lava' ? 0.06 : look === 'gas' || look === 'storm' ? -0.07 : 0.09, 0.14) },
      uLight, uTime, ...light,
      uSeed: { value: seed * 7.31 },
      uGlow: { value: 1 },
      uRim: { value: 0.8 },
      uBump: { value: look === 'gas' ? 0 : look === 'storm' ? 0.035 : look === 'city' ? 0.02 : look === 'rock' ? 0.075 : 0.06 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  const surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 72, 48), mat);
  surface.rotation.z = s.tilt ?? 0.35;
  group.add(surface);

  // clouds drift over ocean worlds and storms, a little above the ground and at their own speed
  let clouds: THREE.Mesh | null = null;
  if (look === 'terra' || s.clouds) {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.035, 48, 32),
      new THREE.ShaderMaterial({
        uniforms: { uLight, uTime, ...light, uSeed: { value: seed * 3.17 }, uCover: { value: look === 'terra' ? 0.54 : 0.58 } },
        vertexShader: VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false,
      }),
    );
    clouds.rotation.z = surface.rotation.z;
    group.add(clouds);
  }

  let ring: THREE.Mesh | null = null;
  const uCenter = { value: new THREE.Vector3() };
  if (s.ring) {
    const inner = radius * 1.36, width = radius * (look === 'gas' ? 0.7 : 0.5);
    ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, inner + width, 128, 1),
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(main) }, uLight, uCenter, uInner: { value: inner }, uWidth: { value: width }, uR: { value: radius }, uAlpha: { value: 0.5 } },
        vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2 + 0.42 + (seed % 3) * 0.08;
    ring.rotation.y = 0.25;
    group.add(ring);
  }

  // moons: small cratered rocks on tilted orbits
  const moons: { pivot: THREE.Group; mesh: THREE.Mesh; speed: number }[] = [];
  if (opts.moons !== false) {
    for (let k = 0; k < (s.moons ?? 0); k++) {
      const pivot = new THREE.Group();
      pivot.rotation.set(0.35 + k * 0.5, k * 2.1 + seed, 0.2 - k * 0.3);
      const r = radius * (0.16 + ((seed + k) % 3) * 0.035);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ map: planetTexture('craters', shade(main, 0.25 - k * 0.2), seed * 5 + k, 128), roughness: 0.95, metalness: 0 }));
      mesh.position.x = radius * (1.9 + k * 0.55) + (s.ring ? radius * 0.9 : 0);
      pivot.add(mesh);
      group.add(pivot);
      moons.push({ pivot, mesh, speed: 0.22 / (1 + k * 0.6) });
    }
  }

  function setTheme(next: Theme) {
    const dark = next === 'dark';
    // by day (the light theme) the whole globe is lit and the night lights are nearly off
    light.uAmbient.value = dark ? 0.16 : 0.7;
    light.uSun.value = dark ? 0.82 : 0.42;
    mat.uniforms.uGlow.value = dark ? 1 : 0.22;
    mat.uniforms.uRim.value = dark ? 0.8 : 0.25;
    if (ring) (ring.material as THREE.ShaderMaterial).uniforms.uAlpha.value = dark ? 0.5 : 0.75;
  }
  setTheme(theme);

  return {
    group, surface, radius, look, setTheme,
    update(dt, time, motion, at) {
      uLight.value.copy(at);
      uTime.value = time * (motion || 0.0001);
      if (clouds) clouds.rotation.y = surface.rotation.y * 1.35 + time * 0.012 * motion;
      if (ring) group.getWorldPosition(uCenter.value);
      for (const m of moons) {
        m.pivot.rotation.y += dt * m.speed * motion;
        m.mesh.rotation.y += dt * 0.1 * motion;
      }
    },
  };
}
