import { type FC } from 'react';

import RouterHost from '@/routerHost';

/**
 * Root application component.
 *
 * Delegates to {@link RouterHost}, which mounts exactly one router
 * implementation (legacy by default, file-based when
 * `VITE_ROUTER_IMPL=next`) — see DEC-013 for the temporary build-time switch.
 *
 * @returns The root JSX element containing the application router.
 */
const App: FC = () => {
  return <RouterHost />;
};

export default App;
