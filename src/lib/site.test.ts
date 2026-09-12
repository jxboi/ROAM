import { describe, expect, it } from 'vitest';
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, siteOrigin } from './site';

describe('site identity', () => {
  it('describes itself once, for every surface that needs it', () => {
    expect(SITE_NAME).toBe('ROAM');
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(50);
    expect(SITE_DESCRIPTION.length).toBeLessThan(200);
  });

  it('falls back to the origin it is being served from', () => {
    // VITE_SITE_URL is unset under test, which is the per-deployment default.
    expect(siteOrigin()).toBe(window.location.origin);
  });

  it('builds absolute URLs from either shape of path', () => {
    expect(absoluteUrl('/ride/dolomites')).toBe(`${window.location.origin}/ride/dolomites`);
    expect(absoluteUrl('ride/dolomites')).toBe(`${window.location.origin}/ride/dolomites`);
  });
});
