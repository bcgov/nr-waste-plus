/**
 * District-average-volume API — TanStack Query hooks for
 * `/api/configuration/district-average-volumes`.
 *
 * Part of the API layer: a module-level {@link DistrictVolumeResource}
 * singleton bound to the app client; components consume the hooks below
 * and never touch the resource or pipeline directly.
 *
 * @module api/districtVolumes
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
import { queryKeys, type DistrictVolumeQueryParams } from './queryKeys';
import { DistrictVolumeResource } from './resources/district-volume-resource';
import { generateSortArray } from './utils';

import type {
  DistrictVolumeCreate,
  DistrictVolumeDetail,
  DistrictVolumeListItem,
} from './districtvolumes.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';

const districtVolumeResource = new DistrictVolumeResource(client);

/**
 * Searches district volume configurations with the provided sort/pagination parameters.
 *
 * @param input - Sort configuration and pagination settings.
 * @param options - Optional TanStack Query overrides plus an optional `notificationTarget`.
 * @returns The TanStack Query result for the paginated {@link DistrictVolumeListItem} list.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useDistrictVolumeListQuery({
 *   page: 0,
 *   size: 25,
 *   sort: { area: 'ASC' },
 * });
 * ```
 */
export const useDistrictVolumeListQuery = <TData = PageableResponse<DistrictVolumeListItem>>(
  input: DistrictVolumeQueryParams,
  options?: Omit<
    UseQueryOptions<
      PageableResponse<DistrictVolumeListItem>,
      Error,
      TData,
      ReturnType<typeof queryKeys.districtVolume.list>
    >,
    'queryKey' | 'queryFn'
  > &
    QueryNotificationOptions,
) => {
  const { notificationTarget, ...queryOptions } = options ?? {};

  const query = useQuery({
    queryKey: queryKeys.districtVolume.list(input, notificationTarget),
    queryFn: ({ signal }) =>
      districtVolumeResource.getDistrictVolumes(
        undefined,
        {
          page: input.page,
          size: input.size,
          sort: generateSortArray<DistrictVolumeListItem>(input.sort),
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
 * Fetches the detailed information for a specific district volume table by its ID.
 *
 * On error, dispatches an inline notification to `notificationTarget` (when supplied).
 *
 * @param id - The numeric district volume table ID.
 * @param options - Optional TanStack Query overrides plus an optional `notificationTarget`.
 * @returns The TanStack Query result containing the {@link DistrictVolumeDetail}.
 */
export const useDistrictVolumeTableDetailQuery = <TData = DistrictVolumeDetail>(
  id: number,
  options?: Omit<
    UseQueryOptions<TData, Error, TData, ReturnType<typeof queryKeys.districtVolume.detail>>,
    'queryKey' | 'queryFn'
  > &
    QueryNotificationOptions,
) => {
  const { notificationTarget, ...queryOptions } = options ?? {};

  const query = useQuery({
    queryKey: queryKeys.districtVolume.detail(id),
    queryFn: ({ signal }) =>
      districtVolumeResource.getDistrictVolumeTableDetail(id, {
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
 * Creates a new district volume table and returns the created resource ID.
 *
 * The backend returns HTTP 201 (Created) with a Location header pointing to the
 * created resource. The service layer extracts and parses this header to return
 * the numeric ID, which is passed to optional `onSuccess` callback.
 *
 * On error, dispatches an inline notification to `notificationTarget` (when supplied)
 * using the RFC 7807 problem-details payload from the backend when available.
 *
 * @param options - Optional TanStack Query mutation overrides plus:
 *   - `notificationTarget`: Optional target for inline error notifications.
 *   - `onSuccess`: Optional callback invoked with the created district volume ID (allows caller to navigate).
 * @returns The TanStack Query mutation result for creating a district volume table (returns the ID as number).
 *
 * @example
 * ```tsx
 * const mutation = useDistrictVolumeTableCreateMutation({
 *   notificationTarget: 'dv-upload-form',
 *   onSuccess: (id) => navigate(`/district-volumes/${id}`),
 * });
 *
 * mutation.mutate({ area: 'INTERIOR', startDate: '2026-06-01', tableLevelFactor: 1.5, tableData: ... });
 * ```
 */
export const useDistrictVolumeTableCreateMutation = (
  options?: Omit<
    UseMutationOptions<number, Error, DistrictVolumeCreate>,
    'mutationKey' | 'mutationFn' | 'onSuccess'
  > &
    QueryNotificationOptions & {
      /** Called with the created district volume ID on success. */
      onSuccess?: (id: number) => void;
    },
) => {
  const { notificationTarget, onSuccess, ...mutationOptions } = options ?? {};

  const mutation = useMutation({
    mutationKey: queryKeys.districtVolume.create(),
    mutationFn: (body) => districtVolumeResource.createDistrictVolumeTable(body),
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
 * Soft-deletes a future-dated district volume configuration.
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
 * @returns The TanStack Query mutation result for deleting a district volume table.
 *
 * @example
 * ```tsx
 * const mutation = useDistrictVolumeTableDeleteMutation({
 *   notificationTarget: 'district-volume-list',
 *   onSuccess: () => refetch(),
 * });
 *
 * mutation.mutate(42);
 * ```
 */
export const useDistrictVolumeTableDeleteMutation = (
  options?: Omit<
    UseMutationOptions<void, Error, number>,
    'mutationKey' | 'mutationFn' | 'onSuccess'
  > &
    QueryNotificationOptions & {
      /** Called after the district volume table is deleted. */
      onSuccess?: () => void;
    },
) => {
  const { notificationTarget, onSuccess, ...mutationOptions } = options ?? {};

  const mutation = useMutation({
    mutationKey: ['district-volume', 'delete'],
    mutationFn: (id) => districtVolumeResource.deleteDistrictVolume(id),
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
