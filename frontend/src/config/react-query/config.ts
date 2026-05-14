import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

import { noRetry } from './retry';
import { THREE_HOURS } from './TimeUnits';

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnMount: false, // Default is caching fetched values
      refetchOnWindowFocus: false,
      staleTime: THREE_HOURS,
      gcTime: THREE_HOURS,
      retry: noRetry,
    },
  },
};

/**
 * Singleton instance of the QueryClient for the application.
 *
 * Exported to be used in loaders and other non-component logic
 * to ensure cache consistency.
 */
export const queryClient = new QueryClient(queryClientConfig);
