import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';
import { stubLocationReload } from '../test/location';

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error('route blew up');
  return <p>The page rendered</p>;
}

describe('error boundary', () => {
  it('renders its children while nothing is wrong', () => {
    render(<ErrorBoundary><Boom explode={false} /></ErrorBoundary>);
    expect(screen.getByText('The page rendered')).toBeInTheDocument();
  });

  it('shows a recoverable message instead of a blank page', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom explode /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('That road just closed on us.');
    expect(screen.getByRole('link', { name: /back to the rides/i })).toHaveAttribute('href', '/');
    expect(logged).toHaveBeenCalled();
  });

  it('retries the same page on request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let explode = true;
    function Flaky() { return <Boom explode={explode} />; }
    render(<ErrorBoundary><Flaky /></ErrorBoundary>);
    explode = false;
    await userEvent.click(screen.getByRole('button', { name: /try this page again/i }));
    expect(screen.getByText('The page rendered')).toBeInTheDocument();
  });

  it('clears itself when the user navigates to another route', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary resetKey="/ride/dolomites"><Boom explode /></ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<ErrorBoundary resetKey="/saved"><Boom explode={false} /></ErrorBoundary>);
    expect(screen.getByText('The page rendered')).toBeInTheDocument();
  });
});

let locationStub: ReturnType<typeof stubLocationReload>;

describe('recovering from a chunk that will not load', () => {
  afterEach(() => locationStub.restore());

  beforeEach(() => {
    // The reload budget is recorded in session storage; leaving it set would
    // make the next assertion in this file fail for an unrelated reason.
    sessionStorage.clear();
    locationStub = stubLocationReload();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  function Missing(): never {
    throw new Error('Failed to fetch dynamically imported module: /assets/Planner-abc.js');
  }

  it('reloads instead of re-rendering, which React would answer with the same error', async () => {
    render(<ErrorBoundary><Missing /></ErrorBoundary>);
    await userEvent.click(screen.getByRole('button', { name: /try this page again/i }));
    expect(locationStub.reload).toHaveBeenCalledOnce();
  });

  it('still re-renders in place for an ordinary error', async () => {
    let broken = true;
    function Flaky() {
      if (broken) throw new TypeError('cannot read properties of null');
      return <p>The page rendered</p>;
    }
    render(<ErrorBoundary><Flaky /></ErrorBoundary>);
    broken = false;
    await userEvent.click(screen.getByRole('button', { name: /try this page again/i }));
    expect(locationStub.reload).not.toHaveBeenCalled();
    expect(screen.getByText('The page rendered')).toBeInTheDocument();
  });
});

describe('when a reload cannot help', () => {
  afterEach(() => locationStub.restore());

  beforeEach(() => {
    sessionStorage.setItem('roam-chunk-reload', '1');
    locationStub = stubLocationReload();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('stops offering a retry that would do nothing, and leads with the way out', () => {
    function Missing(): never {
      throw new Error('Failed to fetch dynamically imported module: /assets/Planner-abc.js');
    }
    render(<ErrorBoundary><Missing /></ErrorBoundary>);
    expect(screen.queryByRole('button', { name: /try this page again/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the rides/i })).toHaveClass('primary');
  });
});
