import { type FC } from 'react';

import AppRouter from '@/routes/AppRouter';
import DevTools from '@/utils/devtools/DevTools';

/**
 * Root application component.
 *
 * Mounts the TanStack Router provider via {@link AppRouter} and, in development
 * mode only, renders the {@link DevTools} panel. The render guard is statically
 * evaluated by Vite: production builds fold it to `false` and tree-shake the
 * entire devtools module graph out of the bundle.
 *
 * @returns The root JSX element containing the router and, in dev, devtools panels.
 */
const App: FC = () => {
  return (
    <>
      <AppRouter />
      {import.meta.env.DEV && import.meta.env.MODE !== 'test' && <DevTools />}
    </>
  );
};

export default App;
