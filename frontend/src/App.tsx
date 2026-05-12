import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { type FC } from 'react';

import AppRouter from '@/routes/AppRouter';
import { router } from '@/routes/routeTree';

/**
 * Root application component.
 *
 * Mounts the TanStack Router provider via {@link AppRouter} and attaches two sets
 * of development devtools panels:
 * - {@link ReactQueryDevtools} anchored to the bottom-left corner
 * - {@link TanStackRouterDevtools} anchored to the bottom-right corner, bound to
 *   the {@link router} singleton so it reflects the live route state
 *
 * Both devtools panels start collapsed (`initialIsOpen: false`).
 *
 * @returns The root JSX element containing the router and devtools panels.
 */
const App: FC = () => {
  return (
    <>
      <AppRouter />
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      <TanStackRouterDevtools initialIsOpen={false} router={router} position="bottom-right" />
    </>
  );
};

export default App;
