import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'roam-chunk-reload';

/**
 * A chunk that will not load, as each engine words it. Anything else — a
 * TypeError from the module's own top-level code, say — is a real error and
 * reloading would only hide it.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const described = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return /dynamically imported module|module script failed|Loading chunk|ChunkLoadError|Failed to fetch/i.test(described);
}

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
      // Offline, the reload would land on the browser's network error page and
      // take the whole app with it; the boundary's message is kinder.
      const recoverable = isChunkLoadError(error) && navigator.onLine !== false;
      if (!recoverable || alreadyRetried() || typeof window === 'undefined' || !rememberRetry()) throw error;
      window.location.reload();
      // Hold the Suspense fallback rather than flashing an error mid-reload.
      return new Promise<never>(() => {});
    }
  });
}
