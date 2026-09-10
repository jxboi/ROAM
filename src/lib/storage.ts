// Every localStorage access is guarded: the property getter itself throws in
// some privacy modes and sandboxed frames, reads can return corrupt data, and
// writes fail once the origin quota is full.
function store(): Storage | null {
  try {
    const local = globalThis.localStorage;
    if (!local) return null;
    const probe = '__roam_probe__';
    local.setItem(probe, probe);
    local.removeItem(probe);
    return local;
  } catch {
    return null;
  }
}

export function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): boolean {
  try {
    const local = globalThis.localStorage;
    if (!local) return false;
    local.setItem(key, value);
    return true;
  } catch {
    // A refused write reports itself; no probe needed on a path that runs
    // every few hundred milliseconds while someone is typing.
    return false;
  }
}

export function isStorageAvailable(): boolean {
  return store() !== null;
}

/** Fires when another tab writes `key`, so open tabs don't overwrite each other. */
export function subscribeStorage(key: string, onChange: (value: string | null) => void): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key !== null && event.key !== key) return;
    onChange(event.key === null ? null : event.newValue);
  };
  globalThis.addEventListener?.('storage', handler);
  return () => globalThis.removeEventListener?.('storage', handler);
}
