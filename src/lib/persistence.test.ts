import { describe, expect, it } from 'vitest';
import { rides } from '../data/rides';
import { createTrip, planCalendar, planMarkdown, tripBudget } from './planning';
import { EMPTY, parseState } from './persistence';

const ride = rides[0];
const stored = (value: unknown) => JSON.stringify(value);

describe('reading stored state', () => {
  it('falls back to an empty collection for missing or unreadable payloads', () => {
    expect(parseState(null)).toEqual(EMPTY);
    expect(parseState('')).toEqual(EMPTY);
    expect(parseState('{ not json')).toEqual(EMPTY);
    expect(parseState('"a string"')).toEqual(EMPTY);
    expect(parseState('null')).toEqual(EMPTY);
    expect(parseState('[]')).toEqual({ saved: [], compare: [], trips: [] });
  });

  it('keeps only real rides, removes duplicates and holds the comparison cap', () => {
    const state = parseState(stored({
      saved: [ride.id, ride.id, 'deleted-route', 42, null],
      compare: rides.slice(0, 5).map(r => r.id),
    }));
    expect(state.saved).toEqual([ride.id]);
    expect(state.compare).toHaveLength(3);
    expect(state.compare).toEqual(rides.slice(0, 3).map(r => r.id));
  });

  it('round-trips a trip created by the app without altering it', () => {
    const trip = createTrip(ride);
    expect(parseState(stored({ saved: [], compare: [], trips: [trip] })).trips).toEqual([trip]);
  });

  it('repairs a partially written trip instead of throwing the plan away', () => {
    const [{ trips: [repaired] }] = [parseState(stored({
      trips: [{
        id: 'trip-1',
        rideId: ride.id,
        name: '   ',
        startDate: '15/06/2027',
        riders: 99,
        costs: { bike: -5, stay: 'free', food: 999999 },
        checklist: ['gear', 'gear', 'not-a-real-step'],
        notes: 7,
        createdAt: 'yesterday',
        days: [{ title: 'Day one' }, { title: '' }, null],
      }],
    }))];
    expect(repaired.name).toBe(`My ${ride.name.replace(/^The /, '')} ride`);
    expect(repaired.startDate).toBe('');
    expect(repaired.riders).toBe(12);
    expect(repaired.costs).toEqual({ ...ride.costs, bike: 0, food: 10000 });
    expect(repaired.checklist).toEqual(['gear']);
    expect(repaired.notes).toBe('');
    expect(repaired.days).toHaveLength(1);
    expect(repaired.days[0]).toMatchObject({ title: 'Day one', description: '', stay: '', notes: '', km: 0, rest: false });
    expect(Number.isFinite(new Date(repaired.createdAt).getTime())).toBe(true);
    // A repaired trip must still be safe to price and export.
    expect(tripBudget(repaired).total).toBeGreaterThanOrEqual(0);
    expect(planMarkdown(repaired, ride)).toContain('Day one');
  });

  it('drops trips that no longer point at a route or have no days left', () => {
    expect(parseState(stored({ trips: [{ id: 'a', rideId: 'removed-route', days: [{ title: 'Day' }] }] })).trips).toEqual([]);
    expect(parseState(stored({ trips: [{ id: 'b', rideId: ride.id, days: [] }] })).trips).toEqual([]);
    expect(parseState(stored({ trips: 'nope' })).trips).toEqual([]);
  });

  it('gives every plan day a distinct id so edits touch one day only', () => {
    const { trips: [trip] } = parseState(stored({
      trips: [{ id: 't', rideId: ride.id, days: [{ id: 'same', title: 'A' }, { id: 'same', title: 'B' }, { title: 'C' }] }],
    }));
    expect(new Set(trip.days.map(day => day.id)).size).toBe(3);
  });

  it('ignores duplicate trip ids that would render with the same key', () => {
    const trip = createTrip(ride);
    expect(parseState(stored({ trips: [trip, { ...trip, name: 'Copy' }] })).trips).toHaveLength(1);
  });

  it('produces a calendar even when the stored timestamp is unusable', () => {
    const { trips: [trip] } = parseState(stored({
      trips: [{ id: 't', rideId: ride.id, startDate: '2027-06-15', updatedAt: 'not-a-time', days: [{ title: 'Day one' }] }],
    }));
    const calendar = planCalendar(trip);
    expect(calendar).toContain('BEGIN:VEVENT');
    expect(calendar).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });
});
