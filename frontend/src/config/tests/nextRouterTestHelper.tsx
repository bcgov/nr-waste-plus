import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterContextProvider, RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';

import AnnouncerProvider from '@/context/announcer/AnnouncerProvider';
import NotificationProvider from '@/context/notification/NotificationProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import ThemeProvider from '@/context/theme/ThemeProvider';
import { createAppRouter } from '@/router';

import { makeTestQueryClient } from './renderWithApp';

/**
 * Test harnesses for the file-based router.
 *
 * Both build a real router (full generated tree) bound to memory history and a
 * fresh test query client. Mount fresh per `render()` call so route/match
 * state never leaks between tests.
 *
 * Two flavours:
 * - `NextRouterHarness` — `RouterProvider` inside the app provider stack
 *   (Announcer → QueryClient → Preference → Theme → Notification): renders the
 *   real route tree (matches, layouts, lazy chunks). Use for title/404/gate
 *   assertions. `PageTitleProvider` is deliberately excluded — tests wrap with
 *   either the real provider or a `PageTitleContext` spy.
 * - `NextRouterContextHarness` — `RouterContextProvider` alone: provides
 *   router context **without** mounting matches or app providers. Use for
 *   hook probes that only read router metadata (`useNavEntries`); auth,
 *   offline, and flags are module-mocked in those test files.
 */
const useTestRouter = (initialEntries: string[], queryClient: QueryClient) =>
  useMemo(
    () => createAppRouter({ queryClient }, { history: createMemoryHistory({ initialEntries }) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialEntries is a per-mount literal
    [],
  );

export function NextRouterHarness({ initialEntries = ['/'] }: { initialEntries?: string[] }) {
  const queryClient = useMemo(() => makeTestQueryClient(), []);
  const router = useTestRouter(initialEntries, queryClient);
  return (
    <AnnouncerProvider>
      <QueryClientProvider client={queryClient}>
        <PreferenceProvider>
          <ThemeProvider>
            <NotificationProvider>
              <RouterProvider router={router} />
            </NotificationProvider>
          </ThemeProvider>
        </PreferenceProvider>
      </QueryClientProvider>
    </AnnouncerProvider>
  );
}

export function NextRouterContextHarness({ children }: { children?: ReactNode }) {
  const queryClient = useMemo(() => makeTestQueryClient(), []);
  const router = useTestRouter(['/'], queryClient);
  return <RouterContextProvider router={router}>{children}</RouterContextProvider>;
}
