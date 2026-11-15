// Bloom post-processing shared by both scenes. Only bright things (the star,
// engines, city lights) pass the threshold, so the glow stays selective.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Theme } from './common';

export interface Post {
  render(): void;
  setSize(w: number, h: number): void;
  setTheme(theme: Theme): void;
  setPixelRatio(r: number): void;
  /** false renders straight to the canvas, skipping bloom (slow devices) */
  setEnabled(on: boolean): void;
}

const LOOK = {
  dark: { strength: 0.8, radius: 0.5, threshold: 0.74 },
  light: { strength: 0.28, radius: 0.35, threshold: 0.96 },
};

export function bloom(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, theme: Theme): Post {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const pass = new UnrealBloomPass(new THREE.Vector2(256, 256), LOOK[theme].strength, LOOK[theme].radius, LOOK[theme].threshold);
  composer.addPass(pass);
  composer.addPass(new OutputPass());
  let enabled = true;
  return {
    render: () => (enabled ? composer.render() : renderer.render(scene, camera)),
    setEnabled: (on) => (enabled = on),
    setSize: (w, h) => {
      composer.setSize(w, h);
      // bloom at half resolution: it is blurry anyway and much cheaper
      pass.resolution.set(w / 2, h / 2);
    },
    setTheme: (t) => {
      pass.strength = LOOK[t].strength;
      pass.radius = LOOK[t].radius;
      pass.threshold = LOOK[t].threshold;
    },
    setPixelRatio: (r) => composer.setPixelRatio(r),
  };
}
