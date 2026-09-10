import { afterEach, describe, expect, it, vi } from 'vitest';
import { isStorageAvailable, readStorage, subscribeStorage, writeStorage } from './storage';

function memoryStorage(overrides: Partial<Storage> = {}): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    key: index => [...map.keys()][index] ?? null,
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
    removeItem: key => { map.delete(key); },
    ...overrides,
  } as Storage;
}

afterEach(() => vi.unstubAllGlobals());

describe('browser storage guards', () => {
  it('reads and writes when storage behaves', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(isStorageAvailable()).toBe(true);
    expect(writeStorage('k', 'v')).toBe(true);
    expect(readStorage('k')).toBe('v');
    expect(readStorage('missing')).toBeNull();
  });

  it('reports failure instead of throwing when the quota is full', () => {
    vi.stubGlobal('localStorage', memoryStorage({
      setItem: () => { throw new DOMException('exceeded', 'QuotaExceededError'); },
    }));
    expect(writeStorage('k', 'v')).toBe(false);
    expect(isStorageAvailable()).toBe(false);
  });

  it('survives a storage object that throws on access, as in some privacy modes', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(isStorageAvailable()).toBe(false);
    expect(readStorage('k')).toBeNull();
    expect(writeStorage('k', 'v')).toBe(false);
  });

  it('notifies on another tab writing the same key, and on a full clear', () => {
    const seen: (string | null)[] = [];
    const unsubscribe = subscribeStorage('roam', value => seen.push(value));
    window.dispatchEvent(new StorageEvent('storage', { key: 'roam', newValue: '{"a":1}' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'x' }));
    window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null }));
    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', { key: 'roam', newValue: 'ignored' }));
    expect(seen).toEqual(['{"a":1}', null]);
  });
});
