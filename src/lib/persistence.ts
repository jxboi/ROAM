import { rideById } from '../data/rides';
import { CHECKLIST, type PlanDay, type Trip } from './planning';
import type { State } from './store-context';
import { uid } from './id';

export const KEY = 'roam-planner-v1';
/** Guard rails matching the editable ranges the planner UI allows. */
const MAX_COST = 10000;
const MAX_KM = 2000;
const MAX_RIDERS = 12;
const MAX_DAYS = 60;
const COST_KEYS = ['bike', 'stay', 'food', 'fuel', 'extras'] as const;
const CHECKLIST_IDS = new Set(CHECKLIST.map(item => item.id));
export const EMPTY: State = { saved: [], compare: [], trips: [] };

const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const clamp = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const isoDate = (value: unknown): string => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '');
const timestamp = (value: unknown): string => {
  const parsed = typeof value === 'string' ? new Date(value) : new Date(Number.NaN);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
};

function normalizeDay(value: unknown, seen: Set<string>): PlanDay | null {
  if (!value || typeof value !== 'object') return null;
  const day = value as Partial<PlanDay>;
  const title = text(day.title).trim();
  if (!title) return null;
  const id = typeof day.id === 'string' && day.id && !seen.has(day.id) ? day.id : uid();
  seen.add(id);
  return {
    id,
    title: title.slice(0, 200),
    description: text(day.description).slice(0, 2000),
    km: Math.round(clamp(day.km, 0, MAX_KM, 0)),
    stay: text(day.stay).slice(0, 100),
    notes: text(day.notes).slice(0, 5000),
    rest: day.rest === true,
  };
}

/**
 * Stored trips are repaired rather than discarded: a plan someone spent an
 * evening on should survive a partial write or an older payload shape.
 * Only a trip with no recognisable route or no days is dropped.
 */
function normalizeTrip(value: unknown): Trip | null {
  if (!value || typeof value !== 'object') return null;
  const trip = value as Partial<Trip>;
  const ride = typeof trip.rideId === 'string' ? rideById(trip.rideId) : undefined;
  if (!ride) return null;
  const seen = new Set<string>();
  const days = Array.isArray(trip.days)
    ? trip.days.map(day => normalizeDay(day, seen)).filter((day): day is PlanDay => !!day).slice(0, MAX_DAYS)
    : [];
  if (!days.length) return null;
  const costs = Object.fromEntries(
    COST_KEYS.map(key => [key, Math.round(clamp(trip.costs?.[key], 0, MAX_COST, ride.costs[key]))]),
  ) as Trip['costs'];
  return {
    id: typeof trip.id === 'string' && trip.id ? trip.id : uid(),
    rideId: ride.id,
    name: (text(trip.name).trim() || `My ${ride.name.replace(/^The /, '')} ride`).slice(0, 100),
    startDate: isoDate(trip.startDate),
    riders: Math.round(clamp(trip.riders, 1, MAX_RIDERS, 1)),
    ownBike: trip.ownBike === true,
    costs,
    days,
    checklist: Array.isArray(trip.checklist)
      ? [...new Set(trip.checklist.filter((id): id is string => typeof id === 'string' && CHECKLIST_IDS.has(id)))]
      : [],
    notes: text(trip.notes).slice(0, 10000),
    createdAt: timestamp(trip.createdAt),
    updatedAt: timestamp(trip.updatedAt),
  };
}

/** Exported for tests: turns whatever is in storage into state the UI can trust. */
export function parseState(raw: string | null): State {
  if (!raw) return EMPTY;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!data || typeof data !== 'object') return EMPTY;
  const record = data as Record<string, unknown>;
  const rideIds = (value: unknown) =>
    Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && !!rideById(id)))] : [];
  const trips: Trip[] = [];
  const tripIds = new Set<string>();
  if (Array.isArray(record.trips)) {
    for (const candidate of record.trips) {
      const trip = normalizeTrip(candidate);
      if (!trip || tripIds.has(trip.id)) continue;
      tripIds.add(trip.id);
      trips.push(trip);
    }
  }
  return { saved: rideIds(record.saved), compare: rideIds(record.compare).slice(0, 3), trips };
}

