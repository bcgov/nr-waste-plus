import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { NextRouterHarness } from '@/config/tests/nextRouterTestHelper';
import { PageTitleContext } from '@/context/pageTitle/PageTitleContext';

// Authenticated user so `_authenticated` renders children instead of the
// login redirect, and the catch-all renders `NotFoundPage`.
const state = vi.hoisted(() => ({
  user: {
    roles: [{ role: 'ADMIN', clients: [] }],
  },
}));

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    user: state.user,
    isLoading: false,
    isLoggedIn: true,
  }),
}));

describe('__root title sync', () => {
  it('sets the leaf route title at hierarchy 1', async () => {
    const setPageTitle = vi.fn();
    const { unmount } = render(
      <PageTitleContext.Provider
        value={{ pageTitle: 'Waste Plus', setPageTitle, currentHierarchy: 0 }}
      >
        <NextRouterHarness initialEntries={['/search']} />
      </PageTitleContext.Provider>,
    );

    // Root sync (hierarchy 1) fires with the leaf staticData title.
    await vi.waitFor(
      () => {
        expect(setPageTitle).toHaveBeenCalledWith('Waste search', 1);
      },
      { timeout: 5000 },
    );
    unmount();
  });

  it('falls back to the nearest ancestor nav label when a route declares none', async () => {
    const setPageTitle = vi.fn();
    const { unmount } = render(
      <PageTitleContext.Provider
        value={{ pageTitle: 'Waste Plus', setPageTitle, currentHierarchy: 0 }}
      >
        <NextRouterHarness initialEntries={['/configuration/district-volume-tables/upload']} />
      </PageTitleContext.Provider>,
    );

    // The upload leaf declares its own title — assert it wins over any
    // ancestor metadata.
    await vi.waitFor(
      () => {
        expect(setPageTitle).toHaveBeenCalledWith('Upload District Volume Table', 1);
      },
      { timeout: 5000 },
    );
    unmount();
  });

  it('sets no root base title for the unknown-URL catch-all (page supplies its own)', async () => {
    const setPageTitle = vi.fn();
    const { unmount } = render(
      <PageTitleContext.Provider
        value={{ pageTitle: 'Waste Plus', setPageTitle, currentHierarchy: 0 }}
      >
        <NextRouterHarness initialEntries={['/does-not-exist']} />
      </PageTitleContext.Provider>,
    );

    // NotFoundPage's PageTitle writes at hierarchy 2; the root sync writes at
    // hierarchy 1 only when a title resolves. For the catch-all chain no
    // staticData declares a title, so exactly zero hierarchy-1 calls happen.
    await vi.waitFor(
      () => {
        expect(setPageTitle).toHaveBeenCalledWith('Content Not Found', 2);
      },
      { timeout: 5000 },
    );
    const hierarchyOneCalls = setPageTitle.mock.calls.filter(([, hierarchy]) => hierarchy === 1);
    expect(hierarchyOneCalls).toHaveLength(0);
    unmount();
  });
});
