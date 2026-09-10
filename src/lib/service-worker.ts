import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Registers the offline worker and reports when a newer build is waiting.
 *
 * The new worker is never activated on its own. Routes are code-split, so a
 * build swapped in under a running tab can leave it asking for chunks that no
 * longer exist — mid-plan is the worst moment for that. The visitor decides.
 */
export function useServiceWorker() {
  const [updateReady, setUpdateReady] = useState(false);
  const waiting = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let cancelled = false;

    const markWaiting = (worker: ServiceWorker | null) => {
      // Without a controller this is the very first install, which is simply
      // the current build going offline-capable, not an update.
      if (cancelled || !worker || !navigator.serviceWorker.controller) return;
      waiting.current = worker;
      setUpdateReady(true);
    };

    let registration: ServiceWorkerRegistration | undefined;
    const recheck = () => { if (document.visibilityState === 'visible') void registration?.update(); };

    navigator.serviceWorker.register('/sw.js')
      .then(active => {
        if (cancelled) return;
        registration = active;
        markWaiting(active.waiting);
        active.addEventListener('updatefound', () => {
          const installing = active.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed') markWaiting(installing);
          });
        });
        document.addEventListener('visibilitychange', recheck);
      })
      // An unavailable worker is a missing enhancement, never a broken app.
      .catch(() => {});

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', recheck);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const worker = waiting.current;
    if (!worker) {
      window.location.reload();
      return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    worker.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  return { updateReady, applyUpdate };
}
