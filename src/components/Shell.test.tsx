import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { rides } from '../data/rides';
import { StoreProvider } from '../lib/store';
import { KEY } from '../lib/persistence';
import { createTrip } from '../lib/planning';
import { BACKUP_FORMAT, createBackup } from '../lib/backup';
import type { State } from '../lib/store-context';
import { Shell } from './Shell';

function renderShell(route = '/', page = <p>Page content</p>) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route path="*" element={page} />
          </Route>
        </Routes>
      </StoreProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

/** Captures whatever downloadFile hands to the browser. */
function captureDownload() {
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
    blobs.push(blob as Blob);
    return 'blob:captured';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return blobs;
}

const openProfile = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Your travel space' }));
  return screen.getByRole('dialog');
};
const fileInput = (dialog: HTMLElement) => dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
const upload = (name: string, body: string) => new File([body], name, { type: 'application/json' });

describe('app shell', () => {
  it('frames the page with navigation, a skip link and a footer', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Page content');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('For the joy of the journey.');
  });

  it('counts saved rides in the navigation', () => {
    localStorage.setItem(KEY, JSON.stringify({ saved: [rides[0].id, rides[1].id], compare: [], trips: [] }));
    renderShell();
    const desktop = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(desktop).getByRole('link', { name: /Saved rides/ })).toHaveTextContent('2');
  });

  it('warns when the browser will not store the visitor\'s plans', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    renderShell();
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t save these changes/);
  });

  it('offers a shortcut to the comparison, except on the comparison itself', () => {
    const selection = JSON.stringify({ saved: [], compare: [rides[0].id, rides[1].id], trips: [] });
    localStorage.setItem(KEY, selection);
    const { unmount } = renderShell('/');
    expect(screen.getByText('2 rides')).toBeInTheDocument();
    unmount();

    renderShell('/compare');
    expect(screen.queryByText('2 rides')).not.toBeInTheDocument();
  });

  it('clears the comparison from the shortcut', async () => {
    const user = userEvent.setup();
    localStorage.setItem(KEY, JSON.stringify({ saved: [], compare: [rides[0].id], trips: [] }));
    renderShell('/');
    await user.click(screen.getByRole('button', { name: 'Clear comparison' }));
    expect(screen.queryByText(/to compare/)).not.toBeInTheDocument();
  });

  it('explains what the app does and where plans are kept', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Your travel space' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Your saved rides and trips stay in this browser');
    await user.click(within(dialog).getByRole('button', { name: /Let’s explore/ }));
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');
  });

  it('keeps a polite live region for announcing navigation', () => {
    const { container } = renderShell();
    const announcer = container.querySelector('#route-announcer');
    expect(announcer).toHaveAttribute('role', 'status');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
  });
});

describe('backing up and restoring from the profile panel', () => {
  it('downloads everything on the device as one labelled file', async () => {
    const user = userEvent.setup();
    const trip = createTrip(rides[0]);
    localStorage.setItem(KEY, JSON.stringify({ saved: [rides[1].id], compare: [], trips: [trip] }));
    const blobs = captureDownload();
    renderShell();

    await user.click(await openProfile(user).then(dialog => within(dialog).getByRole('button', { name: /Download a backup/ })));
    expect(blobs).toHaveLength(1);
    const backup = JSON.parse(await blobs[0].text());
    expect(backup).toMatchObject({ format: BACKUP_FORMAT, version: 1 });
    expect(backup.state.trips[0].id).toBe(trip.id);
    expect(backup.state.saved).toEqual([rides[1].id]);
    expect(await screen.findByText('Backup downloaded. Keep it somewhere safe.')).toBeInTheDocument();
  });

  it('restores a backup and says what it added', async () => {
    const user = userEvent.setup();
    const state: State = { saved: [rides[2].id], compare: [], trips: [createTrip(rides[0])] };
    renderShell();
    const dialog = await openProfile(user);

    await user.upload(fileInput(dialog), upload('roam-backup.json', createBackup(state)));
    expect(await screen.findByText('Restored 1 trip and 1 saved ride')).toBeInTheDocument();
  });

  it('turns down a file that is not a backup', async () => {
    const user = userEvent.setup();
    renderShell();
    const dialog = await openProfile(user);
    await user.upload(fileInput(dialog), upload('photos.json', '{"holiday":true}'));
    expect(await screen.findByText('That doesn’t look like a ROAM backup.')).toBeInTheDocument();
  });

  it('turns down a file far too large to be a backup', async () => {
    const user = userEvent.setup();
    renderShell();
    const dialog = await openProfile(user);
    const huge = new File(['x'.repeat(5_000_001)], 'huge.json', { type: 'application/json' });
    await user.upload(fileInput(dialog), huge);
    expect(await screen.findByText('That file is too large to be a ROAM backup.')).toBeInTheDocument();
  });
});
