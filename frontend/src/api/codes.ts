/**
 * Codes API — TanStack Query hooks for the three waste-search reference
 * code lists (sampling options, districts, assessment-area statuses).
 *
 * Part of the API layer: a module-level {@link CodesResource} singleton
 * bound to the app client; components consume the hooks below and never
 * touch the resource or pipeline directly.
 *
 * @module api/codes
 */

import {
  useQueries,
  useQuery,
  type QueryFunctionContext,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { client } from './client';
import {
  notifyProblemDetailsError,
  REFERENCE_DATA_QUERY_CONFIG,
  type QueryNotificationOptions,
} from './hookUtils';
import { queryKeys } from './queryKeys';
import { CodesResource } from './resources/codes-resource';

import type { CodeDescriptionDto } from './search.types';

/** One of the three waste-search filter code-list resources available via {@link useCodesQuery}. */
type CodeResource = 'samplingOptions' | 'districtOptions' | 'statusOptions';

const codesResource = new CodesResource(client);

/**
 * Generic hook for fetching one of the three waste-search filter code lists.
 *
 * Uses reference-data cache settings (`staleTime: Infinity`) so the data is
 * fetched once per session and re-fetched only on mount or network reconnect.
 * Optionally surfaces API errors as inline notifications via `notificationTarget`.
 *
 * @param resource - The code list to fetch (`'samplingOptions'`, `'districtOptions'`, or `'statusOptions'`).
 * @param options - TanStack Query options merged on top of reference-data defaults,
 *   plus an optional `notificationTarget` for inline error notifications.
 * @returns The TanStack Query result object for the requested code list.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useCodesQuery('districtOptions', {
 *   notificationTarget: 'waste-search-panel',
 * });
 * ```
 */
export const useCodesQuery = <TData = CodeDescriptionDto[]>(
  resource: CodeResource,
  options?: Omit<
    UseQueryOptions<CodeDescriptionDto[], Error, TData, readonly unknown[]>,
    'queryKey' | 'queryFn'
  > &
    QueryNotificationOptions,
) => {
  const { notificationTarget, ...queryOptions } = options ?? {};

  const keyByResource = {
    samplingOptions: () => queryKeys.codes.samplingOptions(notificationTarget),
    districtOptions: () => queryKeys.codes.districtOptions(notificationTarget),
    statusOptions: () => queryKeys.codes.statusOptions(notificationTarget),
  } as const;

  const queryFnByResource = {
    samplingOptions: ({ signal }: QueryFunctionContext) =>
      codesResource.getSamplingOptions({ signal, meta: { notificationTarget } }),
    districtOptions: ({ signal }: QueryFunctionContext) =>
      codesResource.getDistricts({ signal, meta: { notificationTarget } }),
    statusOptions: ({ signal }: QueryFunctionContext) =>
      codesResource.getAssessAreaStatuses({ signal, meta: { notificationTarget } }),
  } as const;

  const query = useQuery({
    queryKey: keyByResource[resource](),
    queryFn: queryFnByResource[resource],
    ...REFERENCE_DATA_QUERY_CONFIG,
    ...queryOptions,
  });

  useEffect(() => {
    if (!notificationTarget || !query.isError || !query.error) {
      return;
    }

    notifyProblemDetailsError(query.error, notificationTarget);
    // query.errorUpdatedAt is a stable timestamp that only advances when a new error arrives.
    // Using it (instead of query.error object reference) prevents repeat notifications while
    // the same error persists across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationTarget, query.errorUpdatedAt]);

  return query;
};

/**
 * Batched hook that loads all three waste search filter option datasets simultaneously.
 * Uses useQueries to combine the requests while maintaining separate cache entries and error handling.
 *
 * @param notificationTarget Optional target for inline error notifications
 * @returns Array of three query results [samplingOptions, districtOptions, statusOptions]
 *
 * @example
 * ```tsx
 * const [sampling, districts, statuses] = useWasteSearchFilterOptionsQueries('search-filters');
 *
 * if (sampling.isLoading || districts.isLoading || statuses.isLoading) {
 *   return <Spinner />;
 * }
 * ```
 */
export const useWasteSearchFilterOptionsQueries = (notificationTarget?: string) => {
  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.codes.samplingOptions(notificationTarget),
        queryFn: ({ signal }) =>
          codesResource.getSamplingOptions({ signal, meta: { notificationTarget } }),
        ...REFERENCE_DATA_QUERY_CONFIG,
      },
      {
        queryKey: queryKeys.codes.districtOptions(notificationTarget),
        queryFn: ({ signal }) =>
          codesResource.getDistricts({ signal, meta: { notificationTarget } }),
        ...REFERENCE_DATA_QUERY_CONFIG,
      },
      {
        queryKey: queryKeys.codes.statusOptions(notificationTarget),
        queryFn: ({ signal }) =>
          codesResource.getAssessAreaStatuses({ signal, meta: { notificationTarget } }),
        ...REFERENCE_DATA_QUERY_CONFIG,
      },
    ],
  });

  // Handle inline error notifications for each query
  // notifiedRef tracks "index:errorUpdatedAt" keys so each unique error is sent exactly once,
  // even if useQueries hands back a new array reference on unrelated state updates.
  const notifiedRef = useRef<Set<string>>(new Set());

  // Stable string derived from each query's error identity; only changes when a new error arrives.
  const errorKeys = queries
    .map((q, i) => (q.isError && q.errorUpdatedAt > 0 ? `${i}:${q.errorUpdatedAt}` : null))
    .join(',');

  useEffect(() => {
    if (!notificationTarget) {
      return;
    }

    queries.forEach((query, i) => {
      if (!query.isError || !query.error || query.errorUpdatedAt === 0) {
        return;
      }

      const key = `${i}:${query.errorUpdatedAt}`;
      if (notifiedRef.current.has(key)) {
        return;
      }

      notifiedRef.current.add(key);
      notifyProblemDetailsError(query.error, notificationTarget);
    });
    // errorKeys is a stable primitive derived from errorUpdatedAt; the queries array reference
    // is intentionally excluded — it changes on every render from useQueries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationTarget, errorKeys]);

  return queries;
};

/**
 * Convenience hook that fetches district options using reference-data cache settings.
 *
 * Equivalent to `useCodesQuery('districtOptions')` but with a fixed return type
 * and no notification-target support, suitable for contexts that handle errors
 * through their own mechanism.
 *
 * @param options - Optional TanStack Query overrides.
 * @returns The TanStack Query result for the district code list.
 */
export const useDistrictOptionsQuery = <TData = CodeDescriptionDto[]>(
  options?: Omit<
    UseQueryOptions<
      CodeDescriptionDto[],
      Error,
      TData,
      ReturnType<typeof queryKeys.codes.districtOptions>
    >,
    'queryKey' | 'queryFn'
  >,
) => {
  return useQuery({
    queryKey: queryKeys.codes.districtOptions(),
    queryFn: ({ signal }) => codesResource.getDistricts({ signal }),
    ...REFERENCE_DATA_QUERY_CONFIG,
    ...options,
  });
};
