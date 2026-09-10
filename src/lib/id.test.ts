import { afterEach, describe, expect, it, vi } from 'vitest';
import { uid } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('unique ids', () => {
  it('produces distinct v4 identifiers', () => {
    const ids = Array.from({ length: 500 }, uid);
    ids.forEach(id => expect(id).toMatch(UUID_V4));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('still works where crypto.randomUUID is unavailable, as on plain HTTP', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.map(() => 7) });
    expect(uid()).toMatch(UUID_V4);
  });

  it('still works with no Web Crypto at all', () => {
    vi.stubGlobal('crypto', undefined);
    const ids = Array.from({ length: 200 }, uid);
    ids.forEach(id => expect(id).toMatch(UUID_V4));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
