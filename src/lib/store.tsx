import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { StoreContext, type State } from './store-context';
import { rideById, type Ride } from '../data/rides';
import { createTrip, type Trip } from './planning';
import { EMPTY, KEY, parseState } from './persistence';
import { mergeState, type RestoreSummary } from './backup';
import { isStorageAvailable, readStorage, subscribeStorage, writeStorage } from './storage';

/** Notes and budgets change on every keystroke; batch the writes instead. */
const SAVE_DELAY = 400;

export function StoreProvider({ children }: { children: ReactNode }) {
  // One read at mount: useRef evaluates its argument on every render, and this
  // provider re-renders on every keystroke in the planner.
  const [initial] = useState(() => { const raw = readStorage(KEY); return { raw, state: parseState(raw) }; });
  const [state, setState] = useState<State>(initial.state);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(() => !isStorageAvailable());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<State | null>(null);
  const lastWritten = useRef<string | null>(initial.raw);
  // Committed state, readable from event handlers without re-creating callbacks.
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const flush = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    const json = JSON.stringify(next);
    if (json === lastWritten.current) return;
    if (writeStorage(KEY, json)) {
      lastWritten.current = json;
      setStorageError(false);
    } else {
      setStorageError(true);
    }
  }, []);

  useEffect(() => {
    pending.current = state;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state, flush]);

  // A backgrounded or closing tab never gets its debounce timer back.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);

  // Adopt writes from another tab so two open tabs don't silently diverge.
  useEffect(() => subscribeStorage(KEY, raw => {
    if (raw === lastWritten.current) return;
    const incoming = parseState(raw);
    if (pending.current === null) {
      // Nothing waiting to be written here, so the other tab's state is simply
      // the newer one.
      lastWritten.current = raw;
      setState(incoming);
      return;
    }
    // Something is being edited in this tab. Merging keeps those edits — the
    // trip being typed into has the later updatedAt — rather than letting a
    // heart tapped in another tab revert them. lastWritten stays put so the
    // merged result is written out on the next flush.
    setState(current => mergeState(current, incoming).state);
  }), []);

  const toggleSaved = useCallback((id: string) => {
    if (!rideById(id)) return;
    notify(latest.current.saved.includes(id) ? 'Removed from saved rides' : 'Saved for the roads ahead');
    setState(s => ({ ...s, saved: s.saved.includes(id) ? s.saved.filter(x => x !== id) : [...s.saved, id] }));
  }, [notify]);

  const toggleCompare = useCallback((id: string) => {
    if (!rideById(id)) return;
    const { compare } = latest.current;
    if (compare.length >= 3 && !compare.includes(id)) {
      notify('Compare up to 3 rides. Remove one to add another.');
      return;
    }
    setState(s => ({
      ...s,
      compare: s.compare.includes(id) ? s.compare.filter(x => x !== id) : s.compare.length < 3 ? [...s.compare, id] : s.compare,
    }));
  }, [notify]);

  const clearCompare = useCallback(() => setState(s => ({ ...s, compare: [] })), []);

  const newTrip = useCallback((ride: Ride) => {
    const trip = createTrip(ride);
    setState(s => ({ ...s, trips: [trip, ...s.trips] }));
    notify('Your next adventure starts here');
    return trip.id;
  }, [notify]);

  const updateTrip = useCallback((id: string, update: Partial<Trip>) => setState(s => ({
    ...s,
    trips: s.trips.map(trip => trip.id === id
      ? { ...trip, ...update, id: trip.id, rideId: trip.rideId, createdAt: trip.createdAt, updatedAt: new Date().toISOString() }
      : trip),
  })), []);

  const deleteTrip = useCallback((id: string) => {
    setState(s => ({ ...s, trips: s.trips.filter(trip => trip.id !== id) }));
    notify('Trip deleted');
  }, [notify]);

  const restore = useCallback((incoming: State): RestoreSummary => {
    const { state: merged, summary } = mergeState(latest.current, incoming);
    setState(merged);
    return summary;
  }, []);

  /** Every ride and trip this browser holds, gone. The only copy left is a backup. */
  const clearEverything = useCallback(() => {
    setState(EMPTY);
    notify('Your rides and trips have been removed');
  }, [notify]);

  const value = useMemo(() => ({
    ...state, toggleSaved, toggleCompare, clearCompare, newTrip, updateTrip, deleteTrip, restore, clearEverything, notify, toast, storageError,
  }), [state, toggleSaved, toggleCompare, clearCompare, newTrip, updateTrip, deleteTrip, restore, clearEverything, notify, toast, storageError]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
