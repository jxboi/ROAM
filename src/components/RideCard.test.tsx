import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rides, dailyCost } from '../data/rides';
import { money } from '../lib/planning';
import { renderWithApp } from '../test/render';
import { RideCard } from './RideCard';

const ride = rides[0];

beforeEach(() => localStorage.clear());

describe('ride card', () => {
  it('shows what a rider needs to choose between routes', () => {
    renderWithApp(<RideCard ride={ride} />);
    expect(screen.getByRole('heading', { name: ride.name })).toBeInTheDocument();
    expect(screen.getByText(ride.country)).toBeInTheDocument();
    expect(screen.getByText(ride.short)).toBeInTheDocument();
    expect(screen.getByText(`${ride.days} days`)).toBeInTheDocument();
    expect(screen.getByText(`${ride.distance.toLocaleString()} km`)).toBeInTheDocument();
    expect(screen.getAllByText(money(dailyCost(ride)))[0]).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: ride.name }).querySelector('a'))
      .toHaveAttribute('href', `/ride/${ride.id}`);
  });

  // The photo sits inside an aria-hidden link that duplicates the title link,
  // so it is queried by attribute rather than by role.
  it('describes its photo and reserves its space', () => {
    const { container } = renderWithApp(<RideCard ride={ride} />);
    const image = container.querySelector('img')!;
    expect(image).toHaveAttribute('alt', `${ride.name} motorcycle route landscape`);
    expect(image).toHaveAttribute('width', '768');
    expect(image).toHaveAttribute('height', '512');
  });

  it('loads eagerly only when it is above the fold', () => {
    const priority = renderWithApp(<RideCard ride={ride} priority />);
    expect(priority.container.querySelector('img')).toHaveAttribute('loading', 'eager');
    priority.unmount();
    const lazy = renderWithApp(<RideCard ride={ride} />);
    expect(lazy.container.querySelector('img')).toHaveAttribute('loading', 'lazy');
  });

  it('toggles saving and reflects the state to assistive technology', async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCard ride={ride} />);
    const save = screen.getByRole('button', { name: `Save ${ride.name}` });
    expect(save).toHaveAttribute('aria-pressed', 'false');

    await user.click(save);
    const unsave = screen.getByRole('button', { name: `Unsave ${ride.name}` });
    expect(unsave).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers the comparison control only while choosing rides to compare', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithApp(<RideCard ride={ride} />);
    expect(screen.queryByRole('button', { name: 'Compare' })).not.toBeInTheDocument();
    unmount();

    renderWithApp(<RideCard ride={ride} compareMode />);
    const compare = screen.getByRole('button', { name: 'Compare' });
    expect(compare).toHaveAttribute('aria-pressed', 'false');
    await user.click(compare);
    expect(screen.getByRole('button', { name: 'Compare' })).toHaveAttribute('aria-pressed', 'true');
  });
});
