import { type FC } from 'react';

import AppRouter from '@/routes/AppRouter';

/**
 * Root application component.
 *
 * Mounts the TanStack Router provider via {@link AppRouter}.
 *
 * @returns The root JSX element containing the application router.
 */
const App: FC = () => {
  return <AppRouter />;
};

export default App;
