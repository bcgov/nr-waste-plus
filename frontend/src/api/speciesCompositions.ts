/**
 * Species-composition API — TanStack Query hooks for
 * `/api/configuration/species-compositions`.
 *
 * Part of the API layer: a module-level {@link SpeciesCompositionResource}
 * singleton bound to the app client; components consume the hooks below
 * and never touch the resource or pipeline directly.
 *
 * @module api/speciesCompositions
 */

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { client } from './client';
import { notifyProblemDetailsError, type QueryNotificationOptions } from './hookUtils';
import { queryKeys, type SpeciesCompositionQueryParams } from './queryKeys';
import { SpeciesCompositionResource } from './resources/species-composition-resource';
import { generateSortArray } from './utils';

import type {
  SpeciesCompositionCreate,
  SpeciesCompositionDetail,
  SpeciesCompositionListItem,
} from './speciesComposition.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';

const speciesCompositionResource = new SpeciesCompositionResource(client);

/**
 * Searches species composition configurations with the provided sort/pagination parameters.
 *
 * @param input - Sort configuration and pagination settings.
 * @param options - Optional TanStack Query overrides plus an optional `notificationTarget`.
 * @returns The TanStack Query result for the paginated {@link SpeciesCompositionListItem} list.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSpeciesCompositionListQuery({
 *   page: 0,
 *   size: 25,
 *   sort: { startDate: 'DESC' },
 * });
 * ```
 */
export const useSpeciesCompositionListQuery = <
  TData = PageableResponse<SpeciesCompositionListItem>,
>(
  input: SpeciesCompositionQueryParams,
  options?: Omit<
    UseQueryOptions<
      PageableResponse<SpeciesCompositionListItem>,
      Error,
      TData,
      ReturnType<typeof queryKeys.speciesComposition.list>
    >,
    'queryKey' | 'queryFn'
  > &
    QueryNotificationOptions,
) => {
  const { notificationTarget, ...queryOptions } = options ?? {};

  const query = useQuery({
    queryKey: queryKeys.speciesComposition.list(input, notificationTarget),
    queryFn: ({ signal }) =>
      speciesCompositionResource.listSpeciesCompositions(
        {
          page: input.page,
          size: input.size,
          sort: generateSortArray<SpeciesCompositionListItem>(input.sort),
        },
        { signal },
      ),
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
 * Fetches the detailed information for a specific species composition configuration by its ID.
 *
 * On error, dispatches an inline notification to `notificationTarget` (when supplied).
 *
 * @param id - The numeric species composition configuration ID.
 * @param options - Optional TanStack Query overrides plus an optional `notificationTarget`.
 * @returns The TanStack Query result containing the {@link SpeciesCompositionDetail}.
 */
export const useSpeciesCompositionDetailQuery = <TData = SpeciesCompositionDetail>(
  id: number,
  options?: Omit<
    UseQueryOptions<TData, Error, TData, ReturnType<typeof queryKeys.speciesComposition.detail>>,
    'queryKey' | 'queryFn'
  > &
    QueryNotificationOptions,
) => {
  const { notificationTarget, ...queryOptions } = options ?? {};

  const query = useQuery({
    queryKey: queryKeys.speciesComposition.detail(id),
    queryFn: ({ signal }) =>
      speciesCompositionResource.getSpeciesCompositionById(id, {
        signal,
      }) as unknown as Promise<TData>,
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
 * Creates a new species composition table and returns the created resource ID.
 *
 * The backend returns HTTP 201 (Created) with a Location header pointing to the
 * created resource. The service layer extracts and parses this header to return
 * the numeric ID, which is passed to the optional `onSuccess` callback.
 *
 * On error, dispatches an inline notification to `notificationTarget` (when supplied)
 * using the RFC 7807 problem-details payload from the backend when available.
 *
 * @param options - Optional TanStack Query mutation overrides plus:
 *   - `notificationTarget`: Optional target for inline error notifications.
 *   - `onSuccess`: Optional callback invoked with the created species composition ID (allows caller to navigate).
 * @returns The TanStack Query mutation result for creating a species composition table (returns the ID as number).
 *
 * @example
 * ```tsx
 * const mutation = useSpeciesCompositionCreateMutation({
 *   notificationTarget: 'sc-upload-form',
 *   onSuccess: (id) => navigate(`/configuration/species-composition/${id}`),
 * });
 *
 * mutation.mutate({ tableData: { rows: [...] } });
 * ```
 */
export const useSpeciesCompositionCreateMutation = (
  options?: Omit<
    UseMutationOptions<number, Error, SpeciesCompositionCreate>,
    'mutationKey' | 'mutationFn' | 'onSuccess'
  > &
    QueryNotificationOptions & {
      /** Called with the created species composition ID on success. */
      onSuccess?: (id: number) => void;
    },
) => {
  const { notificationTarget, onSuccess, ...mutationOptions } = options ?? {};

  const mutation = useMutation({
    mutationKey: queryKeys.speciesComposition.create(),
    mutationFn: (body) => speciesCompositionResource.createSpeciesComposition(body),
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    ...mutationOptions,
  });

  useEffect(() => {
    if (!notificationTarget || !mutation.isError || !mutation.error) {
      return;
    }

    notifyProblemDetailsError(mutation.error, notificationTarget);
  }, [notificationTarget, mutation.error, mutation.isError]);

  return mutation;
};

/**
 * Soft-deletes a future-dated species composition configuration.
 *
 * Only entries whose start date is strictly after the current business date
 * can be deleted; the backend is authoritative for this rule and surfaces
 * RFC 7807 problem-detail errors (404, 409, 422, 403) through the shared
 * notification middleware.
 *
 * On error, dispatches an inline notification to `notificationTarget` (when
 * supplied) using the problem-details payload from the backend when available.
 *
 * @param options - Optional TanStack Query mutation overrides plus:
 *   - `notificationTarget`: Optional target for inline error notifications.
 *   - `onSuccess`: Optional callback invoked after the delete completes (allows caller to refresh the list).
 * @returns The TanStack Query mutation result for deleting a species composition configuration.
 *
 * @example
 * ```tsx
 * const mutation = useSpeciesCompositionDeleteMutation({
 *   notificationTarget: 'species-composition-list',
 *   onSuccess: () => refetch(),
 * });
 *
 * mutation.mutate(42);
 * ```
 */
export const useSpeciesCompositionDeleteMutation = (
  options?: Omit<
    UseMutationOptions<void, Error, number>,
    'mutationKey' | 'mutationFn' | 'onSuccess'
  > &
    QueryNotificationOptions & {
      /** Called after the species composition configuration is deleted. */
      onSuccess?: () => void;
    },
) => {
  const { notificationTarget, onSuccess, ...mutationOptions } = options ?? {};

  const mutation = useMutation({
    mutationKey: ['species-composition', 'delete'],
    mutationFn: (id) => speciesCompositionResource.deleteSpeciesComposition(id),
    onSuccess: () => {
      onSuccess?.();
    },
    ...mutationOptions,
  });

  useEffect(() => {
    if (!notificationTarget || !mutation.isError || !mutation.error) {
      return;
    }

    notifyProblemDetailsError(mutation.error, notificationTarget);
  }, [notificationTarget, mutation.error, mutation.isError]);

  return mutation;
};
