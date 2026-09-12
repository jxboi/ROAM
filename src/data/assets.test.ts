import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { rides } from './rides';
import { heroSrcSet, panoramaSrcSet, rideSrcSet } from '../lib/images';

// vitest runs from the project root.
const root = process.cwd();
const publicFile = (file: string) => path.join(root, 'public', file);
const manifest = JSON.parse(readFileSync(publicFile('manifest.webmanifest'), 'utf8'));
const indexHtml = readFileSync(path.join(root, 'index.html'), 'utf8');

describe('shipped assets', () => {
  it('has a photo and a share card for every ride', () => {
    for (const ride of rides) {
      expect(existsSync(publicFile(`images/${ride.image}.webp`)), `images/${ride.image}.webp`).toBe(true);
      expect(existsSync(publicFile(`social/${ride.image}.jpg`)), `social/${ride.image}.jpg`).toBe(true);
    }
  });

  it('ships every icon the manifest promises', () => {
    const sources: string[] = manifest.icons.map((icon: { src: string }) => icon.src);
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources) expect(existsSync(publicFile(src.replace(/^\//, ''))), src).toBe(true);
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('only links to files the build actually publishes', () => {
    const referenced = [...indexHtml.matchAll(/(?:href|content|src)="(\/[^"]+)"/g)]
      .map(match => match[1])
      .filter(url => !url.startsWith('/src/'));
    const preloaded = [...indexHtml.matchAll(/imagesrcset="([^"]+)"/g)]
      .flatMap(match => match[1].split(',').map(candidate => candidate.trim().split(/\s+/)[0]));
    expect(referenced.length).toBeGreaterThan(4);
    expect(preloaded.length).toBeGreaterThan(4);
    for (const url of [...referenced, ...preloaded]) expect(existsSync(publicFile(url.replace(/^\//, ''))), url).toBe(true);
  });

  it('preloads exactly the hero candidates the page renders', () => {
    const [panorama, hero] = [...indexHtml.matchAll(/imagesrcset="([^"]+)"/g)].map(match => match[1]);
    expect(panorama).toBe(panoramaSrcSet());
    expect(hero).toBe(heroSrcSet());
  });

  it('ships every width the responsive image helpers offer', () => {
    const candidates = [
      ...rides.flatMap(ride => rideSrcSet(ride.image).split(',')),
      ...heroSrcSet().split(','),
      ...panoramaSrcSet().split(','),
    ].map(candidate => candidate.trim().split(/\s+/)[0]);
    for (const url of candidates) expect(existsSync(publicFile(url.replace(/^\//, ''))), url).toBe(true);
  });

  it('keeps the manifest shortcuts pointing at real routes', () => {
    const routes = new Set(['/', '/saved', '/compare', '/trips']);
    for (const shortcut of manifest.shortcuts ?? []) expect(routes.has(shortcut.url), shortcut.url).toBe(true);
  });

  it('keeps every shipped image within a weight the ladder assumes', () => {
    // A drop-in replacement that skipped `npm run assets` would land here.
    const CAP_KB = 400;
    const oversized = ['images', 'social', 'icons']
      .flatMap(folder => readdirSync(publicFile(folder)).map(file => `${folder}/${file}`))
      .map(file => ({ file, kb: Math.round(statSync(publicFile(file)).size / 1024) }))
      .filter(entry => entry.kb > CAP_KB);
    expect(oversized).toEqual([]);
  });
});
