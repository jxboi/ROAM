import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rides } from '../data/rides';
import { StoreProvider } from './store';
import { useStore } from './store-context';
import { KEY, parseState } from './persistence';

const [first, second, third, fourth] = rides;

function Harness() {
  const store = useStore();
  return (
    <div>
      <p data-testid="saved">{store.saved.join(',')}</p>
      <p data-testid="compare">{store.compare.join(',')}</p>
      <p data-testid="trips">{store.trips.map(trip => trip.name).join(',')}</p>
      <p data-testid="toast">{store.toast}</p>
      <p data-testid="storage-error">{String(store.storageError)}</p>
      {rides.slice(0, 4).map(ride => (
        <div key={ride.id}>
          <button onClick={() => store.toggleSaved(ride.id)}>save {ride.id}</button>
          <button onClick={() => store.toggleCompare(ride.id)}>compare {ride.id}</button>
        </div>
      ))}
      <button onClick={() => store.clearCompare()}>clear compare</button>
      <button onClick={() => store.newTrip(first)}>new trip</button>
      <button onClick={() => store.trips[0] && store.updateTrip(store.trips[0].id, { name: 'Renamed' })}>rename</button>
      <button onClick={() => store.trips[0] && store.deleteTrip(store.trips[0].id)}>delete</button>
      <button onClick={() => store.toggleSaved('not-a-ride')}>save unknown</button>
    </div>
  );
}

const setup = () => {
  const user = userEvent.setup();
  render(<StoreProvider><Harness /></StoreProvider>);
  return user;
};
const saved = () => screen.getByTestId('saved').textContent;
const compare = () => screen.getByTestId('compare').textContent;
const stored = () => parseState(localStorage.getItem(KEY));

/** The store batches writes, so give the debounce a chance to land. */
const flushed = () => waitFor(() => expect(localStorage.getItem(KEY)).not.toBeNull(), { timeout: 2000 });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('store', () => {
  it('starts from what is already in storage', () => {
    localStorage.setItem(KEY, JSON.stringify({ saved: [second.id], compare: [], trips: [] }));
    setup();
    expect(saved()).toBe(second.id);
  });

  it('saves and unsaves a ride, confirming each with a message', async () => {
    const user = setup();
    await user.click(screen.getByText(`save ${first.id}`));
    expect(saved()).toBe(first.id);
    expect(screen.getByTestId('toast')).toHaveTextContent('Saved for the roads ahead');

    await user.click(screen.getByText(`save ${first.id}`));
    expect(saved()).toBe('');
    expect(screen.getByTestId('toast')).toHaveTextContent('Removed from saved rides');
  });

  it('ignores rides that are not in the catalogue', async () => {
    const user = setup();
    await user.click(screen.getByText('save unknown'));
    expect(saved()).toBe('');
  });

  it('compares at most three rides and says so', async () => {
    const user = setup();
    for (const ride of [first, second, third]) await user.click(screen.getByText(`compare ${ride.id}`));
    expect(compare()).toBe(`${first.id},${second.id},${third.id}`);

    await user.click(screen.getByText(`compare ${fourth.id}`));
    expect(compare()).toBe(`${first.id},${second.id},${third.id}`);
    expect(screen.getByTestId('toast')).toHaveTextContent('Compare up to 3 rides');

    // Removing one makes room again.
    await user.click(screen.getByText(`compare ${first.id}`));
    await user.click(screen.getByText(`compare ${fourth.id}`));
    expect(compare()).toBe(`${second.id},${third.id},${fourth.id}`);

    await user.click(screen.getByText('clear compare'));
    expect(compare()).toBe('');
  });

  it('creates, renames and deletes trips', async () => {
    const user = setup();
    await user.click(screen.getByText('new trip'));
    expect(screen.getByTestId('trips')).toHaveTextContent(`My ${first.name.replace(/^The /, '')} ride`);

    await user.click(screen.getByText('rename'));
    expect(screen.getByTestId('trips')).toHaveTextContent('Renamed');

    await user.click(screen.getByText('delete'));
    expect(screen.getByTestId('trips')).toHaveTextContent('');
    expect(screen.getByTestId('toast')).toHaveTextContent('Trip deleted');
  });

  it('never lets an update rewrite a trip identity', async () => {
    const user = setup();
    await user.click(screen.getByText('new trip'));
    await flushed();
    const before = stored().trips[0];
    await user.click(screen.getByText('rename'));
    await waitFor(() => expect(stored().trips[0].name).toBe('Renamed'));
    const after = stored().trips[0];
    expect(after.id).toBe(before.id);
    expect(after.rideId).toBe(before.rideId);
    expect(after.createdAt).toBe(before.createdAt);
    expect(new Date(after.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before.updatedAt).getTime());
  });

  it('persists what the visitor did', async () => {
    const user = setup();
    await user.click(screen.getByText(`save ${first.id}`));
    await waitFor(() => expect(stored().saved).toEqual([first.id]));
  });

  it('reports a storage failure so the planner can warn about it', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const user = setup();
    await user.click(screen.getByText(`save ${first.id}`));
    await waitFor(() => expect(screen.getByTestId('storage-error')).toHaveTextContent('true'));
    // The change still applies in memory, so the visitor can export a copy.
    expect(saved()).toBe(first.id);
  });

  it('adopts a change made in another tab', async () => {
    setup();
    const payload = JSON.stringify({ saved: [third.id], compare: [], trips: [] });
    localStorage.setItem(KEY, payload);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: payload }));
    });
    await waitFor(() => expect(saved()).toBe(third.id));
  });

  it('clears the confirmation message after a few seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<StoreProvider><Harness /></StoreProvider>);
      await user.click(screen.getByText(`save ${first.id}`));
      expect(screen.getByTestId('toast')).toHaveTextContent('Saved for the roads ahead');
      await act(async () => { vi.advanceTimersByTime(4000); });
      expect(screen.getByTestId('toast')).toHaveTextContent('');
    } finally {
      vi.useRealTimers();
    }
  });
});
