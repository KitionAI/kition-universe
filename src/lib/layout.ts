// Galaxy layout shared by the static SVG poster (server) and the three.js scene
// (client). The poster is drawn with the same perspective camera the scene opens
// with, so when the live scene fades in over the poster nothing jumps.
// Pure functions only: this file is bundled into the browser.

export type Vec3 = [number, number, number];

export interface LayoutCluster {
  id: string;
  angle: number;
  distance: number;
}
export interface LayoutPlanet {
  id: string;
  cluster: string;
}

export const STAR_RADIUS = 5.8;
export const PLANET_RADIUS = 2.0;

const rad = (d: number) => (d * Math.PI) / 180;

/** Planets sit in a loose ring around their cluster centre, on the galaxy plane (y ≈ 0). */
export function layoutPlanets(clusters: LayoutCluster[], planets: LayoutPlanet[]): Record<string, Vec3> {
  const out: Record<string, Vec3> = {};
  for (const c of clusters) {
    const members = planets.filter((p) => p.cluster === c.id);
    const cx = Math.cos(rad(c.angle)) * c.distance;
    const cz = Math.sin(rad(c.angle)) * c.distance;
    const n = members.length;
    const ring = n <= 1 ? 0 : n <= 2 ? 4.2 : n <= 3 ? 5.8 : 12;
    // big clusters turn and stagger their ring so no two planets line up behind each other on screen
    const turn = n > 3 ? -30 : 0;
    members.forEach((p, i) => {
      if (n === 1) {
        out[p.id] = [cx, 0, cz];
        return;
      }
      // start the ring facing the star so the first kit is the one nearest the centre
      const a = rad(c.angle + 180 + turn) + (i / n) * Math.PI * 2;
      const wobble = n > 3 ? (i % 2 ? 1.8 : -1.2) : 0;
      out[p.id] = [cx + Math.cos(a) * (ring + wobble), Math.sin(i * 1.7) * 0.9, cz + Math.sin(a) * (ring + wobble)];
    });
  }
  return out;
}

export function polar(angle: number, distance: number, y = 0): Vec3 {
  return [Math.cos(rad(angle)) * distance, y, Math.sin(rad(angle)) * distance];
}

export interface CameraPreset {
  id: 'landscape' | 'portrait';
  position: Vec3;
  /** horizontal field of view in degrees; kept fixed so the view always fits by width */
  hfov: number;
  width: number; // poster viewBox
  height: number;
  font: number; // poster text scale
}

export const CAMERAS: Record<CameraPreset['id'], CameraPreset> = {
  landscape: { id: 'landscape', position: [0, 50, 74], hfov: 66, width: 1600, height: 900, font: 1 },
  // portrait looks along the x axis, so the galaxy's long side runs down the screen
  portrait: { id: 'portrait', position: [60, 78, 0], hfov: 40, width: 900, height: 1500, font: 1.9 },
};

export const presetFor = (aspect: number): CameraPreset => (aspect < 1 ? CAMERAS.portrait : CAMERAS.landscape);

/** Vertical FOV (degrees) that keeps the preset's horizontal FOV at a given aspect. */
export function vfovFor(preset: CameraPreset, aspect: number): number {
  const h = Math.tan(rad(preset.hfov) / 2);
  return (2 * Math.atan(h / aspect) * 180) / Math.PI;
}

/** Perspective projection identical to a three.js camera at preset.position looking at the origin. */
export function project(p: Vec3, cam: CameraPreset): { x: number; y: number; s: number } {
  const [cx, cy, cz] = cam.position;
  // forward = normalize(origin - camera)
  let fx = -cx, fy = -cy, fz = -cz;
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl; fy /= fl; fz /= fl;
  // right = normalize(forward × up(0,1,0))
  let rx = -fz, ry = 0, rz = fx;
  const rl = Math.hypot(rx, ry, rz);
  rx /= rl; rz /= rl;
  // up = right × forward
  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;
  const dx = p[0] - cx, dy = p[1] - cy, dz = p[2] - cz;
  const depth = dx * fx + dy * fy + dz * fz;
  const xc = dx * rx + dy * ry + dz * rz;
  const yc = dx * ux + dy * uy + dz * uz;
  const tanH = Math.tan(rad(cam.hfov) / 2);
  const pxPerUnit = cam.width / 2 / (depth * tanH);
  return { x: cam.width / 2 + xc * pxPerUnit, y: cam.height / 2 - yc * pxPerUnit, s: pxPerUnit };
}
