// SITE_URL is baked into canonical, hreflang, sitemap, badge and OG URLs.
// Require a public HTTPS origin before building a release for Cloudflare.
const value = process.env.SITE_URL;
let site;
try {
  site = new URL(value);
} catch {
  console.error('Set SITE_URL to your public HTTPS origin before deploying (for example, https://your-site.example.com).');
  process.exit(1);
}

if (
  site.protocol !== 'https:' ||
  !site.hostname.includes('.') ||
  site.hostname === '127.0.0.1' ||
  site.hostname.endsWith('.localhost') ||
  site.pathname !== '/' ||
  site.search ||
  site.hash ||
  site.username ||
  site.password ||
  site.port
) {
  console.error('SITE_URL must be a public HTTPS origin, without a port, path, query or credentials.');
  process.exit(1);
}
