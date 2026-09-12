import { describe, expect, it } from 'vitest';
import { rides } from '../data/rides';
import { createTrip } from './planning';
import { EMPTY } from './persistence';
import { BACKUP_FORMAT, backupFilename, createBackup, describeRestore, describeStored, mergeConcurrent, mergeState, readBackup } from './backup';
import type { State } from './store-context';

const ride = rides[0];
const state = (over: Partial<State> = {}): State => ({ ...EMPTY, ...over });
const at = (trip: ReturnType<typeof createTrip>, updatedAt: string) => ({ ...trip, updatedAt });

describe('backups', () => {
  it('writes a labelled, versioned file that reads back unchanged', () => {
    const original = state({ saved: [ride.id], compare: [ride.id], trips: [createTrip(ride)] });
    const text = createBackup(original);
    expect(JSON.parse(text)).toMatchObject({ format: BACKUP_FORMAT, version: 1 });
    expect(readBackup(text)).toEqual(original);
  });

  it('names the file by the day it was taken', () => {
    expect(backupFilename(new Date('2027-06-15T10:00:00Z'))).toBe('roam-backup-2027-06-15.json');
  });

  it('turns down anything that is not a ROAM backup', () => {
    expect(readBackup('not json at all')).toBeNull();
    expect(readBackup('"a string"')).toBeNull();
    expect(readBackup('{"hello":"world"}')).toBeNull();
    expect(readBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 99, state: {} }))).toBeNull();
  });

  it('still restores a bare state object recovered by hand', () => {
    const restored = readBackup(JSON.stringify({ saved: [ride.id], compare: [], trips: [] }));
    expect(restored).toEqual(state({ saved: [ride.id] }));
  });

  it('repairs a backup that has been edited into an invalid shape', () => {
    const restored = readBackup(JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      state: { saved: ['nope', ride.id], trips: [{ id: 't', rideId: ride.id, riders: 400, days: [{ title: 'Day' }] }] },
    }));
    expect(restored?.saved).toEqual([ride.id]);
    expect(restored?.trips[0].riders).toBe(12);
  });
});

describe('restoring alongside existing plans', () => {
  it('adds trips without touching the ones already here', () => {
    const mine = createTrip(ride);
    const theirs = createTrip(ride);
    const { state: merged, summary } = mergeState(state({ trips: [mine] }), state({ trips: [theirs] }));
    expect(merged.trips.map(trip => trip.id).sort()).toEqual([mine.id, theirs.id].sort());
    expect(summary).toEqual({ trips: 1, saved: 0, replaced: 0 });
  });

  it('keeps whichever copy of a shared trip was edited last', () => {
    const older = at({ ...createTrip(ride), name: 'Older' }, '2027-01-01T00:00:00.000Z');
    const newer = { ...older, name: 'Newer', updatedAt: '2027-06-01T00:00:00.000Z' };
    expect(mergeState(state({ trips: [older] }), state({ trips: [newer] })).state.trips[0].name).toBe('Newer');
    expect(mergeState(state({ trips: [newer] }), state({ trips: [older] })).state.trips[0].name).toBe('Newer');
    expect(mergeState(state({ trips: [newer] }), state({ trips: [older] })).summary.replaced).toBe(0);
  });

  it('unions saved rides without duplicating them', () => {
    const { state: merged, summary } = mergeState(
      state({ saved: [rides[0].id, rides[1].id] }),
      state({ saved: [rides[1].id, rides[2].id] }),
    );
    expect(merged.saved).toEqual([rides[0].id, rides[1].id, rides[2].id]);
    expect(summary.saved).toBe(1);
  });

  it('leaves the current comparison alone', () => {
    const { state: merged } = mergeState(state({ compare: [rides[0].id] }), state({ compare: [rides[1].id] }));
    expect(merged.compare).toEqual([rides[0].id]);
  });

  it('orders trips with the most recently edited first', () => {
    const old = at(createTrip(ride), '2027-01-01T00:00:00.000Z');
    const recent = at(createTrip(ride), '2027-09-01T00:00:00.000Z');
    const { state: merged } = mergeState(state({ trips: [old] }), state({ trips: [recent] }));
    expect(merged.trips[0].id).toBe(recent.id);
  });
});

describe('describing a restore', () => {
  it('says what changed, in words', () => {
    expect(describeRestore({ trips: 0, saved: 0, replaced: 0 })).toBe('That backup is already here — nothing to add');
    expect(describeRestore({ trips: 1, saved: 0, replaced: 0 })).toBe('Restored 1 trip');
    expect(describeRestore({ trips: 3, saved: 2, replaced: 0 })).toBe('Restored 3 trips and 2 saved rides');
    expect(describeRestore({ trips: 2, saved: 1, replaced: 1 })).toBe('Restored 2 trips, 1 newer trip and 1 saved ride');
  });
});

describe('describing what is stored', () => {
  it('counts only what is there, in words', () => {
    expect(describeStored({ trips: 0, saved: 0, compare: 0 })).toBe('nothing');
    expect(describeStored({ trips: 1, saved: 0, compare: 0 })).toBe('1 trip');
    expect(describeStored({ trips: 0, saved: 0, compare: 2 })).toBe('2 rides set aside to compare');
    expect(describeStored({ trips: 2, saved: 1, compare: 3 }))
      .toBe('2 trips, 1 saved ride and 3 rides set aside to compare');
  });
});

describe('reconciling with another tab mid-edit', () => {
  const older = at({ ...createTrip(ride), name: 'Older' }, '2027-01-01T00:00:00.000Z');
  const newer = { ...older, name: 'Newer', updatedAt: '2027-06-01T00:00:00.000Z' };

  it('keeps the copy edited most recently, whichever side it is on', () => {
    expect(mergeConcurrent(state({ trips: [newer] }), state({ trips: [older] }), state()).trips[0].name).toBe('Newer');
    expect(mergeConcurrent(state({ trips: [older] }), state({ trips: [newer] }), state()).trips[0].name).toBe('Newer');
  });

  it('keeps a trip only one side knows about, rather than losing unwritten work', () => {
    const mine = createTrip(ride);
    const theirs = createTrip(ride);
    const merged = mergeConcurrent(state({ trips: [mine] }), state({ trips: [theirs] }), state());
    expect(merged.trips.map(trip => trip.id).sort()).toEqual([mine.id, theirs.id].sort());
  });

  it('unions saved rides new to both sides, and keeps the comparison this tab is showing', () => {
    const merged = mergeConcurrent(
      state({ saved: [rides[0].id], compare: [rides[0].id] }),
      state({ saved: [rides[1].id], compare: [rides[2].id] }),
      state(),
    );
    expect(merged.saved).toEqual([rides[0].id, rides[1].id]);
    expect(merged.compare).toEqual([rides[0].id]);
  });

  it('does not let a stale copy from the other tab resurrect a ride this tab just unsaved', () => {
    // Both tabs last agreed rides[0] was saved; this tab has since unsaved it
    // (unwritten, alongside some unrelated edit), and the other tab's write
    // predates that removal and still shows it saved.
    const base = state({ saved: [rides[0].id] });
    const merged = mergeConcurrent(state({ saved: [] }), state({ saved: [rides[0].id] }), base);
    expect(merged.saved).toEqual([]);
  });

  it('still keeps a ride the other tab saved fresh, even while this tab is dirty elsewhere', () => {
    const base = state({ saved: [] });
    const merged = mergeConcurrent(state({ saved: [] }), state({ saved: [rides[1].id] }), base);
    expect(merged.saved).toEqual([rides[1].id]);
  });

  it('orders the result with the most recently edited first', () => {
    const merged = mergeConcurrent(state({ trips: [older] }), state({ trips: [createTrip(ride)] }), state());
    expect(new Date(merged.trips[0].updatedAt).getTime())
      .toBeGreaterThanOrEqual(new Date(merged.trips[1].updatedAt).getTime());
  });
});
