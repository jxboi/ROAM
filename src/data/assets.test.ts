import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { rides } from './rides';

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
    expect(referenced.length).toBeGreaterThan(4);
    for (const url of referenced) expect(existsSync(publicFile(url.replace(/^\//, ''))), url).toBe(true);
  });

  it('keeps the manifest shortcuts pointing at real routes', () => {
    const routes = new Set(['/', '/saved', '/compare', '/trips']);
    for (const shortcut of manifest.shortcuts ?? []) expect(routes.has(shortcut.url), shortcut.url).toBe(true);
  });
});
