import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');
const headersFile = read('public/_headers');
const redirects = read('public/_redirects');
const vercel = JSON.parse(read('vercel.json'));
const nginx = read('deploy/security-headers.conf');

const vercelHeaders = new Map<string, string>(
  vercel.headers
    .filter((rule: { source: string }) => rule.source === '/(.*)')
    .flatMap((rule: { headers: { key: string; value: string }[] }) => rule.headers.map(h => [h.key, h.value] as const)),
);

const REQUIRED = [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
  'Content-Security-Policy',
];

describe('deployment configuration', () => {
  it('serves every route from index.html so deep links resolve', () => {
    expect(redirects).toMatch(/^\/\*\s+\/index\.html\s+200$/m);
    const rewrite = vercel.rewrites.find((rule: { destination: string }) => rule.destination === '/index.html');
    expect(rewrite).toBeDefined();
    expect(read('deploy/nginx.conf')).toContain('try_files $uri $uri/ /index.html');
  });

  it('sets the same security headers on every host', () => {
    for (const header of REQUIRED) {
      expect(headersFile, `_headers is missing ${header}`).toContain(`${header}:`);
      expect(vercelHeaders.has(header), `vercel.json is missing ${header}`).toBe(true);
      expect(nginx, `nginx config is missing ${header}`).toContain(`add_header ${header}`);
    }
  });

  it('keeps one content security policy across hosts', () => {
    const fromHeaders = headersFile.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1].trim();
    expect(fromHeaders).toBeTruthy();
    expect(vercelHeaders.get('Content-Security-Policy')).toBe(fromHeaders);
    // nginx cannot upgrade requests it does not terminate TLS for.
    const fromNginx = nginx.match(/add_header Content-Security-Policy "([^"]+)"/)?.[1];
    expect(fromNginx).toBe(fromHeaders?.replace('; upgrade-insecure-requests', ''));
  });

  it('upgrades insecure requests on the hosts that terminate TLS', () => {
    // The local production-parity server strips this, because it serves plain
    // HTTP and engines differ on whether they exempt localhost from the
    // upgrade. It must stay on the real deployments.
    expect(headersFile).toContain('upgrade-insecure-requests');
    expect(vercelHeaders.get('Content-Security-Policy')).toContain('upgrade-insecure-requests');
    expect(read('scripts/serve-dist.mjs')).toContain('upgrade-insecure-requests');
  });

  it('refuses inline and third-party scripts, and inline styles', () => {
    const csp = headersFile.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1] ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toMatch(/script-src 'self'\s*;/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('caches hashed output forever and revalidates the entry point', () => {
    expect(headersFile).toMatch(/\/assets\/\*\n\s*Cache-Control: public, max-age=31536000, immutable/);
    expect(headersFile).toMatch(/Cache-Control: public, max-age=0, must-revalidate/);
  });
});
