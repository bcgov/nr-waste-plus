/**
 * Search API — TanStack Query hooks and imperative helpers for
 * `/api/search` reporting-unit endpoints.
 *
 * @module api/search
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';

import { client } from './client';
import { notifyProblemDetailsError, type QueryNotificationOptions } from './hookUtils';
import { queryKeys, type ReportingUnitsQueryParams } from './queryKeys';
import { SearchResource } from './resources/search-resource';
import { generateSortArray } from './utils';

import type { ReportingUnitSearchExpandedDto, ReportingUnitSearchResultDto } from './search.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';

const searchResource = new SearchResource(client);

/**
 * Searches reporting units with the provided filter/sort/pagination parameters.
 *
 * On error, dispatches an inline notification to `notificationTarget` (when supplied)
 * using the RFC 7807 problem-details payload from the backend when available.
 *
 * @param input - Filter criteria, sort configuration, and pagination settings.
 * @param options - Optional TanStack Query overrides plus an optional `notificationTarget`.
 * @returns The TanStack Query result for the paginated {@link ReportingUnitSearchResultDto} list.
 */
export const useSearchReportingUnitsQuery = <
  TData = PageableResponse<ReportingUnitSearchResultDto>,
>(
  input: ReportingUnitsQueryParams,
  options?: Omit<
    UseQueryOptions<
      PageableResponse<ReportingUnitSearchResultDto>,
      Error,
      TData,
      ReturnType<typeof queryKeys.search.reportingUnits>
    >,
    'queryKey' | 'queryFn'
  > &
    QueryNotificationOptions,
) => {
  const { notificationTarget, ...queryOptions } = options ?? {};

  const query = useQuery({
    queryKey: queryKeys.search.reportingUnits(input, notificationTarget),
    queryFn: ({ signal }) =>
      searchResource.searchReportingUnit(
        input.filters,
        {
          page: input.page,
          size: input.size,
          sort: generateSortArray<ReportingUnitSearchResultDto>(input.sort),
        },
        {
          signal,
          meta: { notificationTarget },
        },
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
 * Fetches the expanded search result for a specific row in the waste search table.
 *
 * The query is disabled until both `ruId` and `wasteAssessmentAreaId` are non-null,
 * preventing premature fetches during row initialisation. Results are cached indefinitely
 * (`staleTime: Infinity`) since expanded data is unlikely to change within a session.
 *
 * @param rowId - Stable row identifier used as part of the query cache key.
 * @param ruId - Reporting unit ID; query is disabled when `null`.
 * @param wasteAssessmentAreaId - Waste assessment area ID; query is disabled when `null`.
 * @param options - Optional TanStack Query overrides.
 * @returns The TanStack Query result containing the {@link ReportingUnitSearchExpandedDto}.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useReportingUnitExpandQuery(row.id, row.ruId, row.wasteAssessmentAreaId);
 *
 * if (isLoading) return <ExpandableRowSkeleton />;
 * ```
 */
export const useReportingUnitExpandQuery = <TData = ReportingUnitSearchExpandedDto>(
  rowId: string,
  ruId: number | null,
  wasteAssessmentAreaId: number | null,
  options?: Omit<
    UseQueryOptions<
      ReportingUnitSearchExpandedDto,
      Error,
      TData,
      ReturnType<typeof queryKeys.search.reportingUnitExpand>
    >,
    'queryKey' | 'queryFn'
  >,
) => {
  return useQuery({
    queryKey: queryKeys.search.reportingUnitExpand(rowId, ruId, wasteAssessmentAreaId),
    queryFn: ({ signal }) => {
      if (ruId === null || wasteAssessmentAreaId === null) {
        throw new Error('Reporting unit expand query requires both IDs.');
      }
      return searchResource.getReportingUnitSearchExpand(ruId, wasteAssessmentAreaId, { signal });
    },
    enabled: ruId !== null && wasteAssessmentAreaId !== null,
    staleTime: Infinity,
    ...options,
  });
};

/**
 * Imperative submitter lookup for non-hook call sites (autocomplete callbacks).
 *
 * Mirrors the pre-migration direct `APIs.search.searchReportingUnitUsers(value)`
 * usage in the advanced waste-search filters.
 *
 * @param value - The IDIR/BCeID fragment to search for.
 * @param signal - Optional AbortSignal for cancellation.
 */
export const searchReportingUnitUsers = (value: string, signal?: AbortSignal): Promise<string[]> =>
  searchResource.searchReportingUnitUsers(value, { signal });
