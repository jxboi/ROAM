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
    // getRandomValues fills the array it is given and returns it; a stub that
    // returns a new one would let a uid() that ignored it pass.
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => { bytes.fill(7); return bytes; } });
    const id = uid();
    expect(id).toMatch(UUID_V4);
    // Every byte comes from the source, with only the version and variant
    // nibbles stamped over it.
    expect(id).toBe('07070707-0707-4707-8707-070707070707');
  });

  it('still works with no Web Crypto at all', () => {
    vi.stubGlobal('crypto', undefined);
    const ids = Array.from({ length: 200 }, uid);
    ids.forEach(id => expect(id).toMatch(UUID_V4));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
