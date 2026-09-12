import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const css = readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [full] : [];
  });
}

describe('stylesheet portability', () => {
  it('pairs every backdrop filter with the prefix Safari needs', () => {
    // Safari, iOS included, only supported -webkit-backdrop-filter until 18.
    const unprefixed = css.match(/(?<!-webkit-)backdrop-filter\s*:/g) ?? [];
    const prefixed = css.match(/-webkit-backdrop-filter\s*:/g) ?? [];
    expect(prefixed).toHaveLength(unprefixed.length);
  });

  it('never asks for a scroll behaviour older engines reject', () => {
    // 'instant' joined the ScrollBehavior enum late, and an unknown enum value
    // throws a TypeError rather than being ignored.
    const offenders = sourceFiles(path.join(root, 'src'))
      .filter(file => /behavior\s*:\s*['"]instant['"]/.test(readFileSync(file, 'utf8')))
      .map(file => path.relative(root, file));
    expect(offenders).toEqual([]);
  });

  it('honours a reduced-motion preference', () => {
    expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)/);
  });
});
