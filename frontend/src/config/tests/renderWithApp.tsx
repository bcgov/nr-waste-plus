import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { act, render } from '@testing-library/react';
import { type ReactElement } from 'react';

import { createTestRouter } from './routerTestHelper';

import { AuthProvider } from '@/context/auth/AuthProvider';
import NotificationProvider from '@/context/notification/NotificationProvider';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import ThemeProvider from '@/context/theme/ThemeProvider';

export interface RenderWithAppOptions {
  /** Initial URL path for the in-memory router (default: '/'). */
  route?: string;
  /** Custom QueryClient; defaults to a new client with retry: false. */
  queryClient?: QueryClient;
}

/**
 * Creates a QueryClient with sensible test defaults (retry: false, no caching).
 */
export function makeTestQueryClient(overrides?: QueryClient): QueryClient {
  return (
    overrides ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    })
  );
}

/**
 * Renders `ui` wrapped in the full application provider stack:
 * `QueryClientProvider → PreferenceProvider → ThemeProvider →
 * RouterProvider → AuthProvider → NotificationProvider → PageTitleProvider`
 *
 * Use this for synchronous renders where the component does not trigger async
 * effects on mount. For async renders, use {@link renderWithAppAsync}.
 *
 * @param ui - The element to render.
 * @param options - Optional route path and queryClient overrides.
 *
 * @example
 * ```tsx
 * it('renders the heading', () => {
 *   renderWithApp(<MyPage />);
 *   screen.getByRole('heading', { name: 'My Page' });
 * });
 * ```
 */
export function renderWithApp(ui: ReactElement, options?: RenderWithAppOptions) {
  const qc = makeTestQueryClient(options?.queryClient);
  return render(
    <QueryClientProvider client={qc}>
      <PreferenceProvider>
        <ThemeProvider>
          <RouterProvider
            router={createTestRouter(
              () => (
                <AuthProvider>
                  <NotificationProvider>
                    <PageTitleProvider>{ui}</PageTitleProvider>
                  </NotificationProvider>
                </AuthProvider>
              ),
              options?.route,
            )}
          />
        </ThemeProvider>
      </PreferenceProvider>
    </QueryClientProvider>,
  );
}

/**
 * Like {@link renderWithApp} but wraps the render call in `act(async () => …)`.
 *
 * Use this for components that trigger async state updates on mount
 * (e.g., data fetching via TanStack Query or Amplify auth resolution).
 *
 * @param ui - The element to render.
 * @param options - Optional route path and queryClient overrides.
 *
 * @example
 * ```tsx
 * it('loads and displays data', async () => {
 *   await renderWithAppAsync(<WasteSearchPage />);
 *   await waitFor(() => screen.getByText('Results'));
 * });
 * ```
 */
export async function renderWithAppAsync(
  ui: ReactElement,
  options?: RenderWithAppOptions,
): Promise<ReturnType<typeof render>> {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = renderWithApp(ui, options);
  });
  return result;
}
