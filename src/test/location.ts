import { vi } from 'vitest';

/**
 * Replaces window.location with a copy whose reload is a spy.
 *
 * jsdom exposes Location's members as own enumerable properties, so spreading
 * carries all of them; only reload needs replacing. Restoring matters, because
 * a defineProperty is not undone by vitest's mock restoration, and every test
 * after one that forgot would inherit the stub.
 */
export function stubLocationReload() {
  const original = Object.getOwnPropertyDescriptor(window, 'location')!;
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    configurable: true,
    writable: true,
  });
  return { reload, restore: () => Object.defineProperty(window, 'location', original) };
}
