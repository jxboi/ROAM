import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'roam-chunk-reload';

function alreadyRetried(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_KEY) === '1';
  } catch {
    return false;
  }
}

/** Returns false when the attempt could not be recorded, in which case a reload
 *  could loop forever and is not worth risking. */
function rememberRetry(): boolean {
  try {
    sessionStorage.setItem(RELOAD_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

function forgetRetry() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch { /* nothing to forget */ }
}

/**
 * A route chunk that survives a deploy landing mid-session.
 *
 * Chunk filenames are content-hashed, so a build published while someone has
 * the app open removes the file their tab will ask for on the next navigation.
 * One reload picks up the new build. The attempt is recorded so a genuinely
 * broken chunk surfaces as an error instead of a reload loop.
 */
export function lazyRoute<T extends ComponentType<Record<string, never>>>(
  load: () => Promise<Record<string, unknown>>,
  exportName: string,
) {
  return lazy(async () => {
    try {
      const loaded = await load();
      forgetRetry();
      return { default: loaded[exportName] as T };
    } catch (error) {
      if (alreadyRetried() || typeof window === 'undefined' || !rememberRetry()) throw error;
      window.location.reload();
      // Hold the Suspense fallback rather than flashing an error mid-reload.
      return new Promise<never>(() => {});
    }
  });
}
