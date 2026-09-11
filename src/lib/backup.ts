import type { State } from './store-context';
import { EMPTY, normalizeState } from './persistence';

export const BACKUP_FORMAT = 'roam.backup';
export const BACKUP_VERSION = 1;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  state: State;
};

export type RestoreSummary = { trips: number; saved: number; replaced: number };

/**
 * Plans live only in the browser that made them, so clearing site data or
 * changing device is otherwise a one-way door. This is the way back.
 */
export function createBackup(state: State): string {
  const backup: Backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state: { saved: state.saved, compare: state.compare, trips: state.trips },
  };
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function backupFilename(date = new Date()): string {
  return `roam-backup-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Accepts a backup envelope, and also a bare state object, so a file recovered
 * from the storage key by hand still restores. Returns null when the text is
 * not a ROAM backup at all, and empty state when it is one but holds nothing
 * this version recognises.
 */
export function readBackup(text: string): State | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const envelope = record.format === BACKUP_FORMAT && record.state && typeof record.state === 'object';
  if (envelope) {
    if (typeof record.version === 'number' && record.version > BACKUP_VERSION) return null;
    return normalizeState(record.state);
  }
  // A bare state object must at least look like one.
  if (!Array.isArray(record.trips) && !Array.isArray(record.saved)) return null;
  return normalizeState(record);
}

/**
 * Restoring adds to what is already here rather than replacing it, so
 * restoring on a device that has its own plans cannot wipe them. A trip that
 * exists on both sides keeps whichever copy was edited most recently.
 */
export function mergeState(current: State, incoming: State): { state: State; summary: RestoreSummary } {
  const byId = new Map(current.trips.map(trip => [trip.id, trip]));
  let added = 0;
  let replaced = 0;
  for (const trip of incoming.trips) {
    const existing = byId.get(trip.id);
    if (!existing) {
      byId.set(trip.id, trip);
      added += 1;
      continue;
    }
    if (new Date(trip.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
      byId.set(trip.id, trip);
      replaced += 1;
    }
  }
  const trips = [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const newlySaved = incoming.saved.filter(id => !current.saved.includes(id));
  return {
    state: { ...EMPTY, saved: [...current.saved, ...newlySaved], compare: current.compare, trips },
    summary: { trips: added, saved: newlySaved.length, replaced },
  };
}

/** "a, b and c" — one phrasing, used by every sentence that lists counts. */
function sentence(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Plain-language confirmation of what a restore actually changed. */
export function describeRestore({ trips, saved, replaced }: RestoreSummary): string {
  const parts: string[] = [];
  if (trips) parts.push(`${trips} trip${trips === 1 ? '' : 's'}`);
  if (replaced) parts.push(`${replaced} newer trip${replaced === 1 ? '' : 's'}`);
  if (saved) parts.push(`${saved} saved ride${saved === 1 ? '' : 's'}`);
  if (!parts.length) return 'That backup is already here — nothing to add';
  return `Restored ${sentence(parts)}`;
}

/** "1 trip and 2 saved rides": the same phrasing, for what is about to go. */
export function describeStored({ trips, saved, compare }: { trips: number; saved: number; compare: number }): string {
  const parts: string[] = [];
  if (trips) parts.push(`${trips} trip${trips === 1 ? '' : 's'}`);
  if (saved) parts.push(`${saved} saved ride${saved === 1 ? '' : 's'}`);
  if (compare) parts.push(`${compare} ride${compare === 1 ? '' : 's'} set aside to compare`);
  // The caller only renders this when there is something to remove, but an
  // empty list still has to read as a sentence rather than a gap.
  return parts.length ? sentence(parts) : 'nothing';
}

/**
 * Three-way merge for a plain id list, using the last state both sides are
 * known to have shared as the common ancestor: keeps whatever either side
 * still agrees with that ancestor on, plus anything either side added since.
 * An id missing from `current` that `base` had is a removal `current` made
 * — dropped from the result even if `incoming` (a copy that predates the
 * removal) still has it, rather than a plain union silently reinstating it.
 */
function mergeIds(current: string[], incoming: string[], base: string[]): string[] {
  const baseIds = new Set(base);
  const incomingIds = new Set(incoming);
  const merged = new Set<string>();
  for (const id of current) if (incomingIds.has(id) || !baseIds.has(id)) merged.add(id);
  for (const id of incoming) if (!baseIds.has(id)) merged.add(id);
  return [...merged];
}

/**
 * Reconciles this tab's state with a write from another one, while something
 * here is still being edited. `base` is the last state this tab itself wrote
 * to storage — the point the two tabs are known to have last agreed, and the
 * only way to tell an id one side removed from an id the other side never
 * had, since a plain snapshot carries no per-item history.
 *
 * There is one document per origin, so the two tabs cannot both be right
 * about a trip that only one of them has. Trips keep both, which means one
 * deleted in the other tab reappears — the rarer and more visible mistake —
 * rather than discarding notes being typed here, which would be silent. The
 * comparison stays this tab's: emptying the tray someone is looking at is
 * worse than missing a selection made elsewhere.
 */
export function mergeConcurrent(current: State, incoming: State, base: State): State {
  const byId = new Map(incoming.trips.map(trip => [trip.id, trip]));
  for (const trip of current.trips) {
    const other = byId.get(trip.id);
    if (!other || new Date(trip.updatedAt).getTime() >= new Date(other.updatedAt).getTime()) {
      byId.set(trip.id, trip);
    }
  }
  return {
    saved: mergeIds(current.saved, incoming.saved, base.saved),
    compare: current.compare,
    trips: [...byId.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  };
}
