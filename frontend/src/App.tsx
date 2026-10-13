import { lazy, Suspense, type FC } from 'react';

import AppRouter from '@/routes/AppRouter';

const DevTools =
  import.meta.env.DEV && import.meta.env.MODE !== 'test'
    ? lazy(() => import('@/utils/devtools/DevTools'))
    : () => null;

/**
 * Root application component.
 *
 * Mounts the TanStack Router provider via {@link AppRouter} and, in development
 * mode only, lazy-loads the {@link DevTools} panel. The lazy import is guarded by
 * `import.meta.env.DEV && MODE !== 'test'` so Vite statically eliminates the
 * entire devtools bundle from production builds and unit tests.
 *
 * @returns The root JSX element containing the router and, in dev, devtools panels.
 */
const App: FC = () => {
  return (
    <>
      <AppRouter />
      <Suspense fallback={null}>
        <DevTools />
      </Suspense>
    </>
  );
};

export default App;
