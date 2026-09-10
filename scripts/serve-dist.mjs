#!/usr/bin/env node
// Serves dist/ the way the production hosts are configured to: the header
// rules from public/_headers and the single-page fallback from _redirects.
// End-to-end tests run against this rather than `vite preview`, so a broken
// Content-Security-Policy or a 404 on a deep link fails in CI, not in the wild.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT ?? process.argv[2] ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ics': 'text/calendar; charset=utf-8',
};

/** Parses the Netlify/Cloudflare `_headers` format into ordered path rules. */
function loadHeaderRules() {
  const file = path.join(dist, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  let current = null;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    const separator = line.indexOf(':');
    if (current && separator > 0) {
      current.headers.push([line.slice(0, separator).trim(), line.slice(separator + 1).trim()]);
    }
  }
  return rules;
}

const rules = loadHeaderRules();

function headersFor(pathname) {
  const merged = new Map();
  for (const rule of rules) {
    const pattern = rule.pattern;
    // '/*' and '/assets/*' are both prefix rules; everything else is exact.
    const matches = pattern.endsWith('/*')
      ? pathname.startsWith(pattern.slice(0, -1))
      : pattern === pathname;
    if (matches) for (const [name, value] of rule.headers) merged.set(name, value);
  }
  // This server speaks plain HTTP. upgrade-insecure-requests belongs on the
  // HTTPS deployment, and engines differ on whether they exempt localhost from
  // it: WebKit does not, so it would upgrade every script and stylesheet to a
  // port that is not listening and render a blank page.
  const policy = merged.get('Content-Security-Policy');
  if (policy?.includes('upgrade-insecure-requests')) {
    merged.set('Content-Security-Policy', policy.replace(/;?\s*upgrade-insecure-requests/, ''));
  }
  return merged;
}

function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = path.join(dist, decoded);
  // Refuse anything that escapes dist, however it was encoded.
  if (candidate !== dist && !candidate.startsWith(dist + path.sep)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  if (existsSync(path.join(candidate, 'index.html'))) return path.join(candidate, 'index.html');
  // Anything without a file extension is an app route, not a missing asset.
  if (!path.extname(decoded)) return path.join(dist, 'index.html');
  return null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? host}`);
  const file = resolveFile(url.pathname);
  const applied = headersFor(url.pathname);

  if (!file || !existsSync(file)) {
    for (const [name, value] of applied) response.setHeader(name, value);
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  for (const [name, value] of applied) response.setHeader(name, value);
  response.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
  response.setHeader('Content-Length', statSync(file).size);
  if (request.method === 'HEAD') {
    response.writeHead(200);
    response.end();
    return;
  }
  response.writeHead(200);
  createReadStream(file).pipe(response);
});

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html is missing. Run `npm run build` first.');
  process.exit(1);
}

server.listen(port, host, () => console.log(`Serving dist/ with production headers on http://${host}:${port}`));
