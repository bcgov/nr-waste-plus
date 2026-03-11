import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, afterEach, it, expect } from 'vitest';

import AppRoutes from './AppRoutes';

import * as useAuthModule from '@/context/auth/useAuth';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/routes/routePaths', () => ({
  getPublicRoutes: () => [
    { path: '/', element: <div>Public Page</div> },
    { path: '*', element: <div>Not Found</div> },
  ],
  getProtectedRoutes: () => [
    { path: '/', element: <div>Protected Page</div> },
    { path: '*', element: <div>Not Found</div> },
  ],
}));

describe('AppRoutes', () => {
  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    // Reset jsdom URL back to root so each test starts clean.
    globalThis.history.pushState({}, '', '/');
  });

  it('renders loading spinner when auth is loading', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoading: true,
      isLoggedIn: false,
    });

    render(
      <PageTitleProvider>
        <AppRoutes />
      </PageTitleProvider>,
    );

    const status = screen.getByTestId('loading');
    expect(status).toBeTruthy();
    expect(status.textContent?.toLowerCase()).toContain('loading');
  });

  it('renders public routes if not logged in', async () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoading: false,
      isLoggedIn: false,
    });

    render(
      <PageTitleProvider>
        <AppRoutes />
      </PageTitleProvider>,
    );

    const content = await screen.findByText('Public Page');
    expect(content).toBeTruthy();
  });

  it('renders protected routes if logged in', async () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoading: false,
      isLoggedIn: true,
    });

    render(
      <PageTitleProvider>
        <AppRoutes />
      </PageTitleProvider>,
    );

    const content = await screen.findByText('Protected Page');
    expect(content).toBeTruthy();
  });

  describe('redirect-after-login', () => {
    it('saves the intended URL to sessionStorage when auth resolves as logged-out', async () => {
      globalThis.history.pushState({}, '', '/search?district=DFN');

      (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isLoggedIn: false,
        user: undefined,
      });

      render(
        <PageTitleProvider>
          <AppRoutes />
        </PageTitleProvider>,
      );

      await waitFor(() => {
        expect(sessionStorage.getItem('redirectAfterLogin')).toBe('/search?district=DFN');
      });
    });

    it('does not save when the current path is an excluded (public) path', async () => {
      // Default jsdom URL is '/' — which is in PATHS_NOT_TO_REDIRECT.
      (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isLoggedIn: false,
        user: undefined,
      });

      render(
        <PageTitleProvider>
          <AppRoutes />
        </PageTitleProvider>,
      );

      // Allow any pending effects to run.
      await screen.findByText('Public Page');
      expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
    });

    it('does not save when the current path is /dashboard', async () => {
      globalThis.history.pushState({}, '', '/dashboard?district=DFN');

      (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isLoggedIn: false,
        user: undefined,
      });

      render(
        <PageTitleProvider>
          <AppRoutes />
        </PageTitleProvider>,
      );

      await screen.findByText('Not Found');
      expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
      expect(sessionStorage.getItem('returnTo')).toBeNull();
    });

    it('does not clear redirectAfterLogin in AppRoutes when the user logs in', async () => {
      sessionStorage.setItem('redirectAfterLogin', '/search?district=DFN');

      (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        isLoading: false,
        isLoggedIn: true,
        user: { roles: [] },
      });

      render(
        <PageTitleProvider>
          <AppRoutes />
        </PageTitleProvider>,
      );

      await waitFor(() => {
        expect(sessionStorage.getItem('redirectAfterLogin')).toBe('/search?district=DFN');
      });
    });
  });
});
