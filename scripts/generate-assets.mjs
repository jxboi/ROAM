#!/usr/bin/env node
// Derives the social cards and PWA icons that the app references from the
// source imagery already committed under public/images. Re-run with
// `npm run assets` after changing a destination photo or the mark.
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const images = path.join(root, 'public', 'images');
const social = path.join(root, 'public', 'social');
const icons = path.join(root, 'public', 'icons');

const CARD = { width: 1200, height: 630 };

/**
 * Display widths the layout actually asks for. A destination photo fills a
 * ~400px card slot on desktop and the viewport width on a phone; shipping the
 * 1280px original into either is most of the page weight.
 */
const RESPONSIVE_WIDTHS = {
  // Steps of roughly 1.4x, chosen so the common cases land on a close fit: a
  // ~380px card at 1x, the same at 2x, and a phone-width photo at 2x and 3x.
  ride: [400, 560, 800, 1120],
  hero: [480, 800, 1200],
  'hero-panorama': [1200, 1440, 1800],
};

/** Read the `image` field straight from the ride data so the two cannot drift. */
async function rideImages() {
  const source = await readFile(path.join(root, 'src', 'data', 'rides.ts'), 'utf8');
  const names = [...source.matchAll(/\bimage\s*:\s*'([a-z0-9-]+)'/g)].map(match => match[1]);
  if (!names.length) throw new Error('No ride images found in src/data/rides.ts');
  return [...new Set(names)];
}

async function card(source, destination) {
  const input = path.join(images, `${source}.webp`);
  if (!existsSync(input)) throw new Error(`Missing source image: ${input}`);
  await sharp(input)
    .resize({ ...CARD, fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(destination);
  return destination;
}

async function icon(svg, size, destination, background) {
  const image = sharp(Buffer.from(svg), { density: 384 }).resize(size, size, { fit: 'contain' });
  await (background ? image.flatten({ background }) : image).png({ compressionLevel: 9 }).toFile(destination);
  return destination;
}

/** Maskable icons need the mark inside the safe zone, so pad it by 20%. */
function maskableSvg(mark) {
  const inner = mark.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-13 -13 90 90"><rect x="-13" y="-13" width="90" height="90" fill="#183b32"/>${inner}</svg>`;
}

/** Writes narrower copies of a source image alongside it, as name-<width>.webp. */
async function variants(name, widths) {
  const input = path.join(images, `${name}.webp`);
  const { width: original } = await sharp(input).metadata();
  const files = [];
  for (const width of widths) {
    if (!original || width >= original) continue;
    const destination = path.join(images, `${name}-${width}.webp`);
    await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(destination);
    files.push(destination);
  }
  return files;
}

const written = [];
await mkdir(social, { recursive: true });
await mkdir(icons, { recursive: true });

written.push(await card('hero-panorama', path.join(root, 'public', 'social-card.jpg')));
for (const name of await rideImages()) {
  written.push(await card(name, path.join(social, `${name}.jpg`)));
  written.push(...await variants(name, RESPONSIVE_WIDTHS.ride));
}
for (const name of ['hero', 'hero-panorama']) written.push(...await variants(name, RESPONSIVE_WIDTHS[name]));

// librsvg rejects trailing whitespace after the closing tag.
const mark = (await readFile(path.join(root, 'public', 'favicon.svg'), 'utf8')).trim();
written.push(await icon(mark, 180, path.join(icons, 'apple-touch-icon.png'), '#183b32'));
written.push(await icon(mark, 192, path.join(icons, 'icon-192.png')));
written.push(await icon(mark, 512, path.join(icons, 'icon-512.png')));
written.push(await icon(maskableSvg(mark), 512, path.join(icons, 'icon-maskable-512.png')));

console.log(`Generated ${written.length} assets:`);
for (const file of written) console.log(`  ${path.relative(root, file)}`);
