import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StoreProvider } from '../lib/store';

/** Renders a component with the providers every page relies on. */
export function renderWithApp(
  ui: ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}><StoreProvider>{children}</StoreProvider></MemoryRouter>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
