/**
 * Forest-clients API — TanStack Query hooks and imperative helpers for
 * `/api/forest-clients` endpoints.
 *
 * @module api/forestClients
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';

import { client } from './client';
import { notifyProblemDetailsError, type QueryNotificationOptions } from './hookUtils';
import { queryKeys } from './queryKeys';
import { ForestClientResource } from './resources/forest-client-resource';
import { forestClientAutocompleteResult2CodeDescription } from './utils';

import type {
  ForestClientAutocompleteResultDto,
  ForestClientDto,
  MyForestClientDto,
} from './forestclient.types';
import type { CodeDescriptionDto } from './search.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';

const forestClientResource = new ForestClientResource(client);

/**
 * Fetches full forest client records for a given list of client numbers.
 *
 * The query is disabled automatically when `clientNumbers` is empty, preventing
 * unnecessary network requests during form initialisation.
 *
 * @param clientNumbers - Ordered list of client number strings to look up.
 * @param options - Optional TanStack Query overrides.
 * @returns The TanStack Query result containing the matching {@link ForestClientDto} records.
 */
export const useForestClientsByNumbersQuery = <TData = ForestClientDto[]>(
  clientNumbers: readonly string[],
  options?: Omit<
    UseQueryOptions<
      ForestClientDto[],
      Error,
      TData,
      ReturnType<typeof queryKeys.forestClient.byClientNumbers>
    >,
    'queryKey' | 'queryFn'
  >,
) => {
  return useQuery({
    queryKey: queryKeys.forestClient.byClientNumbers(clientNumbers),
    queryFn: ({ signal }) =>
      forestClientResource.searchByClientNumbers([...clientNumbers], 0, clientNumbers.length, {
        signal,
      }),
    enabled: clientNumbers.length > 0,
    ...options,
  });
};

/**
 * Fetches the authenticated user's accessible forest clients with pagination and text filtering.
 *
 * @param filter - Free-text filter applied server-side against client name / number.
 * @param page - Zero-based page index.
 * @param size - Number of items per page.
 * @param options - Optional TanStack Query overrides plus an optional `notificationTarget`.
 * @returns The TanStack Query result for the paginated {@link MyForestClientDto} list.
 */
export const useMyForestClientsQuery = <TData = PageableResponse<MyForestClientDto>>(
  filter: string,
  page: number,
  size: number,
  options?: Omit<
    UseQueryOptions<
      PageableResponse<MyForestClientDto>,
      Error,
      TData,
      ReturnType<typeof queryKeys.forestClient.myForestClients>
    >,
    'queryKey' | 'queryFn'
  > &
    QueryNotificationOptions,
) => {
  const { notificationTarget, ...queryOptions } = options ?? {};

  const query = useQuery({
    queryKey: queryKeys.forestClient.myForestClients(filter, page, size, notificationTarget),
    queryFn: ({ signal }) =>
      forestClientResource.searchMyForestClients(filter, page, size, {
        signal,
        meta: { notificationTarget },
      }),
    ...queryOptions,
  });

  useEffect(() => {
    if (!notificationTarget || !query.isError || !query.error) {
      return;
    }

    notifyProblemDetailsError(query.error, notificationTarget);
  }, [notificationTarget, query.error, query.isError]);

  return query;
};

/**
 * Looks up forest clients by a single client code, transforming results into
 * `CodeDescriptionDto` entries suitable for autocomplete inputs.
 *
 * The query is disabled when `clientCode` is falsy or when `enabled` is `false`,
 * allowing the caller to suppress the fetch during user typing debounce periods.
 * Results are cached indefinitely (`staleTime: Infinity`).
 *
 * @param clientCode - The client code to search for; query is skipped when `undefined`.
 * @param enabled - Whether the query is allowed to run.
 * @param options - Optional TanStack Query overrides.
 * @returns The TanStack Query result containing the matched {@link CodeDescriptionDto} entries.
 *
 * @example
 * ```tsx
 * const [debouncedCode] = useDebouncedValue(clientCode, 300);
 * const { data, isLoading } = useClientLookupQuery(debouncedCode, debouncedCode.length >= 3);
 * ```
 */
export const useClientLookupQuery = <TData = CodeDescriptionDto[]>(
  clientCode: string | undefined,
  enabled: boolean,
  options?: Omit<
    UseQueryOptions<
      CodeDescriptionDto[],
      Error,
      TData,
      ReturnType<typeof queryKeys.forestClient.lookupByClientCode>
    >,
    'queryKey' | 'queryFn'
  >,
) => {
  return useQuery({
    queryKey: queryKeys.forestClient.lookupByClientCode(clientCode ?? ''),
    queryFn: async ({ signal }) => {
      if (!clientCode) {
        return [];
      }

      return (await forestClientResource.searchForestClients(clientCode, 0, 1, { signal })).map(
        forestClientAutocompleteResult2CodeDescription,
      );
    },
    enabled: enabled && Boolean(clientCode),
    staleTime: Infinity,
    ...options,
  });
};

/**
 * Imperative forest-client autocomplete lookup for non-hook call sites
 * (e.g. Carbon autocomplete callbacks).
 *
 * Mirrors the pre-migration direct `APIs.forestclient.searchForestClients(value, 0, 10)`
 * usage; callers map results with `forestClientAutocompleteResult2CodeDescription`.
 *
 * @param value - The name/acronym/number fragment to search for.
 * @param signal - Optional AbortSignal for cancellation.
 */
export const lookupForestClients = (
  value: string,
  signal?: AbortSignal,
): Promise<ForestClientAutocompleteResultDto[]> =>
  forestClientResource.searchForestClients(value, 0, 10, { signal });
