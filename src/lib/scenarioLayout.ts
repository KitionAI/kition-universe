// Where things stand inside a scenario galaxy, in the galaxy's own coordinates.
// Shared by the three.js scene and the static poster. Pure functions only.
import type { Vec3 } from './layout';
import type { GalaxyForm } from './scenarioGalaxies';

export interface ScenarioLayout {
  /** one position per kit, in step order */
  worlds: Vec3[];
  /** size of each kit world (the hub kit is larger) */
  scale: number[];
  /** the result deck, where the finished files end up */
  deck: Vec3;
  /** centres of the two groups of a binary galaxy */
  foci: Vec3[];
}

export function layoutScenario(form: GalaxyForm, n: number, hubIndex = 0): ScenarioLayout {
  const worlds: Vec3[] = [];
  const scale = Array.from({ length: n }, () => 1);
  if (form === 'lane') {
    // steps in a line, the result at the far end
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0.5;
      worlds.push([-36 + t * 46, 0, Math.sin(t * Math.PI * 1.25 - 0.5) * 8]);
    }
    return { worlds, scale, deck: [31, 0, -2], foci: [] };
  }
  if (form === 'ring') {
    // a loop around the result
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI * 0.75;
      worlds.push([Math.cos(a) * 27, 0, Math.sin(a) * 21]);
    }
    return { worlds, scale, deck: [0, 0, 0], foci: [] };
  }
  if (form === 'binary') {
    // two groups, each around its own centre, with the result between them
    const foci: Vec3[] = [[-21, 0, 3], [21, 0, -3]];
    const left = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const side = i < left ? 0 : 1;
      const m = side ? n - left : left;
      const j = side ? i - left : i;
      const a = (j / Math.max(1, m)) * Math.PI * 2 + (side ? 0.5 : Math.PI + 0.5);
      const r = m === 1 ? 0 : 10.5;
      worlds.push([foci[side][0] + Math.cos(a) * r, 0, foci[side][2] + Math.sin(a) * r]);
    }
    return { worlds, scale, deck: [0, 0, 0], foci };
  }
  // hub: one kit in the middle, the others on an arc to its left, the result on its right
  const others = n - 1;
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i === hubIndex) {
      worlds.push([-3, 0, 0]);
      scale[i] = 1.45;
      continue;
    }
    const a = Math.PI * 0.56 + ((j + 0.5) / Math.max(1, others)) * Math.PI * 0.88;
    worlds.push([-3 + Math.cos(a) * 27, 0, Math.sin(a) * 22]);
    j++;
  }
  return { worlds, scale, deck: [28, 0, 2], foci: [] };
}
