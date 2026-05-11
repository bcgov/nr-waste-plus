import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { type FC } from 'react';

import AppRouter from '@/routes/AppRouter';
import { router } from '@/routes/routeTree';

/**
 * Renders the application route tree and development tooling.
 *
 * @returns The root application component.
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
