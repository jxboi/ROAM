import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState, Modal, Note, PageHeading, RideStats } from './ui';

const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('modal', () => {
  it('stays closed until it is asked to open', () => {
    const { rerender } = render(<Modal open={false} onClose={() => {}} title="Filters">body</Modal>);
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');
    rerender(<Modal open onClose={() => {}} title="Filters">body</Modal>);
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
  });

  it('is named for assistive technology and closes from its own control', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Find your kind of ride"><p>body</p></Modal>);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Find your kind of ride');
    expect(screen.getByRole('heading', { name: 'Find your kind of ride' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape through the dialog cancel event', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Filters">body</Modal>);
    screen.getByRole('dialog').dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('stops the page behind it from scrolling, and restores it afterwards', () => {
    const { rerender } = render(<Modal open onClose={() => {}} title="Filters">body</Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Modal open={false} onClose={() => {}} title="Filters">body</Modal>);
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});

describe('supporting components', () => {
  it('points an empty state somewhere useful', () => {
    inRouter(<EmptyState title="Nothing saved" description="Tap a heart to begin." />);
    expect(screen.getByRole('heading', { name: 'Nothing saved' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore the rides/ })).toHaveAttribute('href', '/');
  });

  it('lets an empty state supply its own action', () => {
    inRouter(<EmptyState title="No matches" description="Try another month."><button>Show all rides</button></EmptyState>);
    expect(screen.getByRole('button', { name: 'Show all rides' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('summarises a route in three numbers', () => {
    render(<RideStats ride={{ days: 6, distance: 1750, difficulty: 'Moderate' }} />);
    expect(screen.getByText('6 days')).toBeInTheDocument();
    expect(screen.getByText('1,750 km')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('renders a page heading with room for an action', () => {
    render(<PageHeading title="My trips" description="Taking shape."><button>New</button></PageHeading>);
    expect(screen.getByRole('heading', { level: 1, name: 'My trips' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });

  it('marks small print as such', () => {
    const { container } = render(<Note>Estimates only.</Note>);
    expect(container.querySelector('.fine-print')).toHaveTextContent('Estimates only.');
  });
});
