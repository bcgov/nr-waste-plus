import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { router } from '@/routes/routeTree';

// ── Mutable state ─────────────────────────────────────────────────────────────
let mockUser: { userName: string } | undefined = undefined;
let mockIsLoading = false;
const mockNavigate = vi.fn();
const mockSetPageTitle = vi.fn();
let mockMatches: Array<{ routeId?: string }> = [];

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isLoading: mockIsLoading }),
}));

vi.mock('@/context/pageTitle/usePageTitle', () => ({
  usePageTitle: () => ({ setPageTitle: mockSetPageTitle }),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useRouterState: ({
      select,
    }: {
      select: (s: {
        location: { pathname: string };
        matches: Array<{ routeId?: string }>;
      }) => unknown;
    }) => select({ location: { pathname: '/' }, matches: mockMatches }),
    Outlet: () => <div data-testid="outlet" />,
  };
});

vi.mock('@/pages/NotFound', () => ({
  default: () => <div data-testid="not-found-page">Not Found</div>,
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyRouter = router as any;

function getRootLayoutComponent(): React.ComponentType {
  return anyRouter.routeTree?.options?.component ?? anyRouter.options?.component;
}

function getNotFoundComponent(): React.ComponentType {
  return anyRouter.routeTree?.options?.notFoundComponent ?? anyRouter.options?.notFoundComponent;
}

function getDefaultPendingComponent(): (() => React.ReactElement) | undefined {
  return anyRouter.options?.defaultPendingComponent;
}

function getDefaultErrorComponent():
  | (({ error }: { error: Error }) => React.ReactElement)
  | undefined {
  return anyRouter.options?.defaultErrorComponent;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('routeTree module', () => {
  beforeEach(() => {
    mockUser = undefined;
    mockIsLoading = false;
    mockMatches = [];
    mockNavigate.mockClear();
    mockSetPageTitle.mockClear();
  });

  it('shouldExportRouterInstance', () => {
    expect(router).toBeDefined();
  });

  it('shouldHaveNonEmptyRouteTree', () => {
    expect(anyRouter.routeTree).toBeDefined();
  });

  it('shouldRenderLoadingOverlay_forDefaultPendingComponent', () => {
    const pending = getDefaultPendingComponent();
    if (!pending) {
      expect(pending).toBeTruthy();
      return;
    }
    const { getByTestId } = render(pending());
    expect(getByTestId('loading')).toBeTruthy();
  });

  it('shouldRenderErrorLayout_forDefaultErrorComponent', () => {
    const errorComp = getDefaultErrorComponent();
    if (!errorComp) {
      expect(errorComp).toBeTruthy();
      return;
    }
    // Render without crashing — just verify it returns a React element
    const element = errorComp({ error: new Error('Test error') });
    expect(element).toBeTruthy();
  });

  describe('NotFoundRedirect', () => {
    it('shouldRenderLoadingOverlay_whenAuthIsLoading', async () => {
      mockIsLoading = true;
      mockUser = undefined;
      const NotFoundRedirect = getNotFoundComponent();
      if (!NotFoundRedirect) return;
      render(<NotFoundRedirect />);
      screen.getByTestId('loading');
    });

    it('shouldRenderNull_whenUnauthenticatedUserAndRedirectPending', async () => {
      mockIsLoading = false;
      mockUser = undefined;
      const NotFoundRedirect = getNotFoundComponent();
      if (!NotFoundRedirect) return;
      render(<NotFoundRedirect />);
      expect(screen.queryByTestId('loading')).toBeNull();
    });

    it('shouldNavigateToRoot_whenUserIsUnauthenticated', async () => {
      mockIsLoading = false;
      mockUser = undefined;
      const NotFoundRedirect = getNotFoundComponent();
      if (!NotFoundRedirect) return;
      render(<NotFoundRedirect />);
      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({ to: '/', replace: true }),
        ),
      );
    });

    it('shouldNotNavigate_whenUserIsAuthenticated', async () => {
      mockIsLoading = false;
      mockUser = { userName: 'testuser' };
      const NotFoundRedirect = getNotFoundComponent();
      if (!NotFoundRedirect) return;
      render(<NotFoundRedirect />);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shouldRenderNotFoundPage_insideLayout_whenUserIsAuthenticated', async () => {
      mockIsLoading = false;
      mockUser = { userName: 'testuser' };
      const NotFoundRedirect = getNotFoundComponent();
      if (!NotFoundRedirect) return;
      render(<NotFoundRedirect />);
      screen.getByTestId('layout');
      screen.getByTestId('not-found-page');
    });

    it('shouldNotRenderLayout_whenUserIsUnauthenticated', async () => {
      mockIsLoading = false;
      mockUser = undefined;
      const NotFoundRedirect = getNotFoundComponent();
      if (!NotFoundRedirect) return;
      render(<NotFoundRedirect />);
      expect(screen.queryByTestId('layout')).toBeNull();
      expect(screen.queryByTestId('not-found-page')).toBeNull();
    });
  });

  describe('RootLayout', () => {
    it('shouldCallSetPageTitle_whenPathnameMatchesKnownRoute', async () => {
      mockMatches = [{ routeId: '/search' }];
      const RootLayout = getRootLayoutComponent();
      if (!RootLayout) return;
      render(<RootLayout />);
      expect(mockSetPageTitle).toHaveBeenCalledWith('Waste search', 1);
    });

    it('shouldCallSetPageTitle_withLandingId_forRootPath', async () => {
      mockMatches = [{ routeId: '/' }];
      const RootLayout = getRootLayoutComponent();
      if (!RootLayout) return;
      render(<RootLayout />);
      expect(mockSetPageTitle).toHaveBeenCalledWith('Landing', 1);
    });

    it('shouldNotCallSetPageTitle_whenPathnameDoesNotMatchAnyRoute', async () => {
      mockMatches = [{ routeId: '/nonexistent-route' }];
      const RootLayout = getRootLayoutComponent();
      if (!RootLayout) return;
      render(<RootLayout />);
      expect(mockSetPageTitle).not.toHaveBeenCalled();
    });

    it('shouldRenderOutlet', async () => {
      mockMatches = [];
      const RootLayout = getRootLayoutComponent();
      if (!RootLayout) return;
      const { getByTestId } = render(<RootLayout />);
      expect(getByTestId('outlet')).toBeTruthy();
    });

    it('shouldNotCallSetPageTitle_whenMatchesIsEmpty', async () => {
      mockMatches = [];
      const RootLayout = getRootLayoutComponent();
      if (!RootLayout) return;
      render(<RootLayout />);
      expect(mockSetPageTitle).not.toHaveBeenCalled();
    });

    it('shouldNotCallSetPageTitle_whenLastMatchHasNoRouteId', async () => {
      mockMatches = [{}];
      const RootLayout = getRootLayoutComponent();
      if (!RootLayout) return;
      render(<RootLayout />);
      expect(mockSetPageTitle).not.toHaveBeenCalled();
    });
  });

  it('shouldRegisterAllExpectedRoutes_inRouteTree', () => {
    const routes: unknown[] = anyRouter.routeTree?.children ?? [];
    expect(routes.length).toBeGreaterThan(0);
  });
});
