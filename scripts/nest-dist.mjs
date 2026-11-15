// Cloudflare Workers static assets map URL paths to files 1:1, so when the
// site is served at kition.ai/universe the build output must live under
// dist/universe/ (and the Worker's 404-page handling looks for dist/404.html
// at the top level).
import { access, cp, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const BASE = (process.env.UNIVERSE_BASE ?? '').replace(/^\/|\/$/g, '');
if (!BASE) process.exit(0);

const exists = (p) => access(p).then(() => true, () => false);

// Idempotent: a second run (e.g. build:cloudflare then preview:cloudflare,
// both nesting) should be a no-op, not a crash or a double-nest.
if ((await exists(join(DIST, BASE, 'index.html'))) && !(await exists(join(DIST, 'index.html')))) {
  console.log('[nest-dist] already nested');
  process.exit(0);
}
if (!(await exists(join(DIST, 'index.html')))) {
  console.error(`[nest-dist] ${join(DIST, 'index.html')} not found; run the build first.`);
  process.exit(1);
}

const tmp = `${DIST}-nest-tmp`;
await rm(tmp, { recursive: true, force: true });
await rename(DIST, tmp);
await mkdir(DIST, { recursive: true });
await rename(tmp, join(DIST, BASE));
await cp(join(DIST, BASE, '404.html'), join(DIST, '404.html'));
console.log(`[nest-dist] moved ${(await readdir(join(DIST, BASE))).length} entries into dist/${BASE}/`);
