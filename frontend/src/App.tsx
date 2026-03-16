import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type FC } from 'react';

import AppRoutes from '@/routes/AppRoutes';

/**
 * Renders the application route tree and development tooling.
 *
 * @returns The root application component.
 */
const App: FC = () => {
  return (
    <>
      <AppRoutes />
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </>
  );
};

export default App;
