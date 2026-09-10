#!/usr/bin/env node
// Fails the build when the bytes a first-time visitor downloads creep past the
// agreed budget. Sizes are gzipped, because that is what goes over the wire.
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

/**
 * Kilobytes, gzipped, with roughly 15% headroom over the current build.
 * Raise deliberately, with a reason.
 */
const BUDGET = {
  initialJs: 118,
  initialCss: 15,
  totalJs: 135,
};

if (!existsSync(dist)) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

const kb = (bytes) => bytes / 1024;
const gzipped = (file) => gzipSync(readFileSync(path.join(dist, file))).length;
const format = (value) => `${value.toFixed(1)} kB`;

const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
// Everything the entry document pulls in before the app can render.
const initial = [...html.matchAll(/(?:src|href)="\/([^"]+\.(?:js|css))"/g)].map(match => match[1]);
const initialJs = initial.filter(file => file.endsWith('.js'));
const initialCss = initial.filter(file => file.endsWith('.css'));

const allJs = readdirSync(path.join(dist, 'assets'))
  .filter(file => file.endsWith('.js'))
  .map(file => path.join('assets', file));

const sum = (files) => files.reduce((total, file) => total + gzipped(file), 0);
const measured = {
  initialJs: kb(sum(initialJs)),
  initialCss: kb(sum(initialCss)),
  totalJs: kb(sum(allJs)),
};

const labels = {
  initialJs: `Initial JavaScript (${initialJs.length} file${initialJs.length === 1 ? '' : 's'})`,
  initialCss: `Initial CSS (${initialCss.length} file${initialCss.length === 1 ? '' : 's'})`,
  totalJs: `All JavaScript (${allJs.length} chunks)`,
};

let failed = false;
console.log('Bundle budget (gzipped)\n');
for (const [key, budget] of Object.entries(BUDGET)) {
  const value = measured[key];
  const over = value > budget;
  failed ||= over;
  const share = Math.round((value / budget) * 100);
  console.log(`  ${over ? '✗' : '✓'} ${labels[key].padEnd(34)} ${format(value).padStart(10)} / ${format(budget).padStart(9)}  (${share}%)`);
}

if (failed) {
  console.error('\nBundle budget exceeded. Trim the bundle, or raise the budget in scripts/check-bundle-size.mjs with a reason.');
  process.exit(1);
}
console.log('\nWithin budget.');
