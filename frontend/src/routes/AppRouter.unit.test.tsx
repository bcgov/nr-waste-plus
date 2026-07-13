import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import AppRouter from './AppRouter';

// The router singleton is already created; just verify RouterProvider mounts correctly.
vi.mock('@/routes/routeTree', () => ({
  router: {
    history: { location: { href: '/', pathname: '/', search: '', hash: '' } },
    options: {},
    subscribe: vi.fn(() => () => undefined),
    getRouteMatch: vi.fn(),
    buildLocation: vi.fn(() => ({ href: '/', pathname: '/', search: '', hash: '' })),
    navigate: vi.fn(),
    invalidate: vi.fn(),
    clearCache: vi.fn(),
    load: vi.fn(() => Promise.resolve()),
    update: vi.fn(),
    __store: { state: { status: 'idle', location: { pathname: '/', search: '', hash: '' } } },
  },
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    RouterProvider: ({ router }: { router: unknown }) => (
      <div data-testid="router-provider" data-router={router ? 'present' : 'missing'} />
    ),
  };
});

describe('AppRouter', () => {
  it('shouldRenderRouterProvider', () => {
    render(<AppRouter />);
    screen.getByTestId('router-provider'); // getBy* throws if not found
  });

  it('shouldPassRouterPropToRouterProvider', () => {
    render(<AppRouter />);
    expect(screen.getByTestId('router-provider').dataset.router).toBe('present');
  });
});
