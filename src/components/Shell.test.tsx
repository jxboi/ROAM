import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { rides } from '../data/rides';
import { StoreProvider } from '../lib/store';
import { KEY } from '../lib/persistence';
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
    renderShell();
    const announcers = screen.getAllByRole('status');
    expect(announcers.some(node => node.getAttribute('aria-live') === 'polite')).toBe(true);
  });
});
