import { lazy, type FC } from 'react';

import AppRouter from '@/routes/AppRouter';

const DevTools = import.meta.env.DEV ? lazy(() => import('./DevTools')) : () => null;

/**
 * Root application component.
 *
 * Mounts the TanStack Router provider via {@link AppRouter} and, in development
 * mode only, lazy-loads the {@link DevTools} panel. The lazy import is guarded by
 * `import.meta.env.DEV` so Vite statically eliminates the entire devtools bundle
 * from production builds — the widget never appears in staging or deployed builds.
 *
 * @returns The root JSX element containing the router and, in dev, devtools panels.
 */
const App: FC = () => {
  return (
    <>
      <AppRouter />
      <DevTools />
    </>
  );
};

export default App;
