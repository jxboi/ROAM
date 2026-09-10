import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component, Suspense, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { lazyRoute } from './lazy-route';

class ErrorSink extends Component<{ children: ReactNode; onError: (error: Error) => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: Error) { this.props.onError(error); }
  override render() { return this.state.failed ? <p>Failed</p> : this.props.children; }
}

const reload = vi.fn();

function Page() {
  return <p>Route content</p>;
}

const renderRoute = (Route: ReturnType<typeof lazyRoute>) =>
  render(<Suspense fallback={<p>Loading</p>}><Route /></Suspense>);

beforeEach(() => {
  sessionStorage.clear();
  reload.mockClear();
  Object.defineProperty(window, 'location', { value: { ...window.location, reload }, configurable: true, writable: true });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('lazily loaded routes', () => {
  it('renders the named export once the chunk arrives', async () => {
    const Route = lazyRoute(async () => ({ Page }), 'Page');
    renderRoute(Route);
    expect(await screen.findByText('Route content')).toBeInTheDocument();
  });

  it('reloads once when a chunk has gone, which is what a mid-session deploy looks like', async () => {
    const Route = lazyRoute(async () => { throw new Error('Failed to fetch dynamically imported module'); }, 'Page');
    renderRoute(Route);
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    // The fallback stays up rather than flashing an error while the page reloads.
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(sessionStorage.getItem('roam-chunk-reload')).toBe('1');
  });

  it('does not reload for an error that is not a missing chunk', async () => {
    const Route = lazyRoute(async () => { throw new TypeError('cannot read properties of null'); }, 'Page');
    const onError = vi.fn();
    render(
      <Suspense fallback={<p>Loading</p>}>
        <ErrorSink onError={onError}><Route /></ErrorSink>
      </Suspense>,
    );
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('roam-chunk-reload')).toBeNull();
  });

  it('does not reload while offline, where the reload would fail too', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    const Route = lazyRoute(async () => { throw new Error('Failed to fetch dynamically imported module'); }, 'Page');
    const onError = vi.fn();
    render(
      <Suspense fallback={<p>Loading</p>}>
        <ErrorSink onError={onError}><Route /></ErrorSink>
      </Suspense>,
    );
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(reload).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  });

  it('surfaces the error rather than looping when a reload did not help', async () => {
    sessionStorage.setItem('roam-chunk-reload', '1');
    const Route = lazyRoute(async () => { throw new Error('still missing'); }, 'Page');
    const onError = vi.fn();
    render(
      <Suspense fallback={<p>Loading</p>}>
        <ErrorSink onError={onError}><Route /></ErrorSink>
      </Suspense>,
    );
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(reload).not.toHaveBeenCalled();
  });

  it('forgets a past retry after a chunk loads cleanly', async () => {
    sessionStorage.setItem('roam-chunk-reload', '1');
    const Route = lazyRoute(async () => ({ Page }), 'Page');
    renderRoute(Route);
    await screen.findByText('Route content');
    expect(sessionStorage.getItem('roam-chunk-reload')).toBeNull();
  });
});
