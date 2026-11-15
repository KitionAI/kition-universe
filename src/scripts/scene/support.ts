// Decides whether to start the 3D scene. Kept free of three.js so the check
// itself costs nothing on devices that end up on the static star map.

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** No GPU: WebGL runs on the CPU (SwiftShader, llvmpipe), far too slow for the scene. */
export function softwareRenderer(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

/** Low-end or data-saving devices start on the static map and can opt in. */
export function lowPower(): boolean {
  if (softwareRenderer()) return true;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  if (nav.connection?.saveData) return true;
  if (nav.connection?.effectiveType && /(^|-)2g$/.test(nav.connection.effectiveType)) return true;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 2) return true;
  if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 3) return true;
  return false;
}

export function forcedMode(): 'static' | '3d' | null {
  // ?mode= sticks for the rest of the tab session, so links from a static page stay static
  const valid = (v: string | null) => (v === 'static' || v === '3d' ? v : null);
  const q = valid(new URLSearchParams(location.search).get('mode'));
  try {
    if (q) sessionStorage.setItem('ku-mode', q);
    return q ?? valid(sessionStorage.getItem('ku-mode'));
  } catch {
    return q;
  }
}

export function whenIdle(fn: () => void) {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 1500 });
  else setTimeout(fn, 200);
}
