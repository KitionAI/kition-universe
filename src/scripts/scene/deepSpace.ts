// An enclosing panorama and three recycled star volumes: no edge to fly past.
import * as THREE from 'three';
import { rng, type Theme } from './common';

export async function deepSpace(scene: THREE.Scene, theme: Theme, small: boolean) {
  const fallback = new THREE.DataTexture(new Uint8Array([3, 6, 15, 255]), 1, 1);
  fallback.needsUpdate = true;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const panorama = await new THREE.TextureLoader().loadAsync(base + '/assets/space/infinite-sky.webp').catch(() => fallback);
  if (panorama !== fallback) fallback.dispose();
  panorama.colorSpace = THREE.SRGBColorSpace;
  panorama.wrapS = THREE.RepeatWrapping;
  panorama.wrapT = THREE.RepeatWrapping;
  const dark = { value: theme === 'dark' ? 1 : 0 };
  const clock = { value: 0 };
  const eye = { value: new THREE.Vector3() };
  const drift = { value: new THREE.Vector2() };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 32), new THREE.ShaderMaterial({
    uniforms: { uMap: { value: panorama }, uDark: dark, uDrift: drift },
    vertexShader: /* glsl */ `varying vec3 vDirection;
      void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */ `uniform sampler2D uMap;uniform float uDark;uniform vec2 uDrift;varying vec3 vDirection;
      void main(){
        vec3 dir=normalize(vDirection);
        vec2 angle=vec2(atan(dir.z,dir.x)/6.2831853+.5,asin(clamp(dir.y,-1.0,1.0))/3.1415927+.5);
        // Repeat the fine field around the sky so stars remain pinpoints at wide viewports.
        vec2 uv=fract(angle*4.0+vec2(uDrift.x,uDrift.y*.05));
        // Blend both edges through the same opposite meridian, hiding the image seam.
        float seam=smoothstep(0.0,.055,min(uv.x,1.0-uv.x));
        vec3 ink=mix(texture2D(uMap,vec2(fract(uv.x+.5),uv.y)).rgb,texture2D(uMap,uv).rgb,seam);
        float seamY=smoothstep(0.0,.055,min(uv.y,1.0-uv.y));
        ink=mix(texture2D(uMap,vec2(fract(uv.x+.5),fract(uv.y+.5))).rgb,ink,seamY);
        float poles=1.0-smoothstep(.87,.99,abs(dir.y));
        vec3 night=mix(vec3(.0015,.003,.008),ink*.68,poles);
        float clouds=dot(ink,vec3(.2126,.7152,.0722));
        vec3 day=mix(vec3(.79,.80,.91),vec3(.57,.60,.78),clamp(clouds*2.0,0.0,.8));
        gl_FragColor=vec4(mix(day,night,uDark),1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false,
  }));
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  scene.add(sky);

  const layers = [
    { count: small ? 650 : 1500, span: 1700, parallax: .16, size: 1.05 },
    { count: small ? 420 : 950, span: 920, parallax: .45, size: 1.2 },
    { count: small ? 200 : 480, span: 440, parallax: .95, size: 1.35 },
  ].map((spec, layer) => {
    const random = rng(7103 + layer * 137);
    const positions = new Float32Array(spec.count * 3);
    const colors = new Float32Array(spec.count * 3);
    const sizes = new Float32Array(spec.count);
    const phases = new Float32Array(spec.count);
    const palette = ['#d2e4ff', '#f0edff', '#92c8e7', '#ffe2b5'].map(c => new THREE.Color(c));
    for (let i = 0; i < spec.count; i++) {
      for (let j = 0; j < 3; j++) positions[i * 3 + j] = (random() - .5) * spec.span;
      const color = palette[Math.floor(random() * palette.length)];
      color.toArray(colors, i * 3);
      sizes[i] = (.7 + Math.pow(random(), 3) * 1.5) * spec.size;
      phases[i] = random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uEye: eye, uTime: clock, uDark: dark, uSpan: { value: spec.span }, uParallax: { value: spec.parallax } },
      vertexShader: /* glsl */ `attribute float size;attribute float phase;uniform vec3 uEye;uniform float uSpan;uniform float uParallax;uniform float uTime;varying vec3 vColor;varying float vAlpha;
        void main(){
          vec3 local=mod(position-uEye*uParallax+uSpan*.5,uSpan)-uSpan*.5;
          float distance=length(local);
          vAlpha=(1.0-smoothstep(uSpan*.34,uSpan*.48,distance))*smoothstep(18.0,60.0,distance);
          vAlpha*=.72+.16*sin(uTime*.22+phase);vColor=color;
          vec3 view=mat3(viewMatrix)*local;
          gl_PointSize=clamp(size*(190.0/max(10.0,-view.z)),.8,3.8);
          gl_Position=projectionMatrix*vec4(view,1.0);
        }`,
      fragmentShader: /* glsl */ `uniform float uDark;varying vec3 vColor;varying float vAlpha;
        void main(){float d=length(gl_PointCoord-.5);float point=1.0-smoothstep(.08,.5,d);
          gl_FragColor=vec4(mix(vec3(.19,.22,.35),vColor,uDark),point*vAlpha*mix(.35,1.0,uDark));}`,
      vertexColors: true, transparent: true, depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    return points;
  });

  return {
    setTheme(next: Theme) { dark.value = next === 'dark' ? 1 : 0; },
    update(camera: THREE.Camera, target: THREE.Vector3, time: number, motion: number) {
      sky.position.copy(camera.position);
      eye.value.copy(camera.position);
      drift.value.set(target.x * .00012, target.z * .0007);
      clock.value = time * motion;
    },
    dispose() {
      scene.remove(sky, ...layers);
      panorama.dispose(); sky.geometry.dispose(); sky.material.dispose();
      layers.forEach(layer => { layer.geometry.dispose(); layer.material.dispose(); });
    },
  };
}
