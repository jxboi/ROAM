import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

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
