import { RouterProvider } from '@tanstack/react-router';
import { type FC } from 'react';

import { router } from '@/router';

/**
 * Root application component.
 *
 * Mounts the TanStack Router provider bound to the file-based router
 * singleton (`src/router.tsx`). The temporary `VITE_ROUTER_IMPL` migration
 * switch and the legacy router tree were removed at cutover (DEC-013/S7);
 * this is now the single router implementation.
 *
 * @returns The root JSX element containing the application router.
 */
const App: FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
