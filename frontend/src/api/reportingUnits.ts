/**
 * Reporting-units API — TanStack Query hooks and the imperative fetch
 * for `/api/reporting-units`.
 *
 * Part of the API layer: a module-level {@link ReportingUnitResource}
 * singleton bound to the app client; components consume the hooks below
 * and the route loader consumes {@link fetchReportingUnit}.
 *
 * @module api/reportingUnits
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
import { queryKeys } from './queryKeys';
import { ReportingUnitResource } from './resources/reporting-unit-resource';

import type { ReportingUnitCreateDto, ReportingUnitDto } from './types';

const reportingUnitResource = new ReportingUnitResource(client);

/**
 * Creates a new reporting unit and returns the created resource ID.
 *
 * The backend returns HTTP 201 (Created) with a Location header pointing to the
 * created resource. The resource layer extracts and parses this header to return
 * the numeric ID, which is passed to optional `onSuccess` callback.
 *
 * On error, dispatches an inline notification to `notificationTarget` (when supplied)
 * using the RFC 7807 problem-details payload from the backend when available.
 *
 * @param options - Optional TanStack Query mutation overrides plus:
 *   - `notificationTarget`: Optional target for inline error notifications.
 *   - `onSuccess`: Optional callback invoked with the created reporting unit ID (allows caller to navigate).
 * @returns The TanStack Query mutation result for creating a reporting unit (returns the ID as number).
 *
 * @example
 * ```tsx
 * const mutation = useReportingUnitCreateMutation({
 *   notificationTarget: 'create-ru-form',
 *   onSuccess: (id) => navigate(`/reporting-units/${id}`),
 * });
 *
 * mutation.mutate({ clientNumber: '00012797', districtCode: 'DKM', samplingCode: 'AVG', gradeCode: null });
 * ```
 */
export const useReportingUnitCreateMutation = (
  options?: Omit<
    UseMutationOptions<number, Error, ReportingUnitCreateDto>,
    'mutationKey' | 'mutationFn' | 'onSuccess'
  > &
    QueryNotificationOptions & {
      /** Called with the created reporting unit ID on success. */
      onSuccess?: (id: number) => void;
    },
) => {
  const { notificationTarget, onSuccess, ...mutationOptions } = options ?? {};

  const mutation = useMutation({
    mutationKey: queryKeys.reportingUnit.create(),
    mutationFn: (body) => reportingUnitResource.createReportingUnit(body),
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
 * Fetches the read-only reporting-unit details for a single reporting unit.
 *
 * Backs every read-only reporting-unit view (for example
 * `/reporting-units/$ruId/$blockId`), which renders the unit's summary
 * fields and page chrome from the returned {@link ReportingUnitDto}.
 *
 * On error, dispatches an inline notification to `notificationTarget` (when supplied)
 * using the RFC 7807 problem-details payload from the backend when available.
 *
 * @param ruId - The numeric reporting unit ID used as the route param and cache key.
 * @param options - Optional TanStack Query overrides plus an optional `notificationTarget`.
 * @returns The TanStack Query result containing the {@link ReportingUnitDto}.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useReportingUnitDetailsQuery(ruId, {
 *   notificationTarget: 'reporting-unit-block-details',
 * });
 * ```
 */
export const useReportingUnitDetailsQuery = <TData = ReportingUnitDto>(
  ruId: number,
  options?: Omit<
    UseQueryOptions<TData, Error, TData, ReturnType<typeof queryKeys.reportingUnit.details>>,
    'queryKey' | 'queryFn'
  > &
    QueryNotificationOptions,
) => {
  const { notificationTarget, ...queryOptions } = options ?? {};

  const query = useQuery({
    queryKey: queryKeys.reportingUnit.details(ruId),
    queryFn: ({ signal }) =>
      reportingUnitResource.getReportingUnit(ruId, {
        signal,
        meta: { notificationTarget },
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
 * Imperative reporting-unit fetch for non-hook contexts (route loader).
 *
 * Shares the cache entry with {@link useReportingUnitDetailsQuery} via
 * `queryKeys.reportingUnit.details` when called through
 * `queryClient.ensureQueryData`.
 *
 * @param ruId - The numeric reporting unit ID.
 * @param signal - Optional AbortSignal for cancellation.
 */
export const fetchReportingUnit = (
  ruId: number,
  signal?: AbortSignal,
): Promise<ReportingUnitDto> => reportingUnitResource.getReportingUnit(ruId, { signal });
