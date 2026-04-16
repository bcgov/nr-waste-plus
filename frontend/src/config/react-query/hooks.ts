import { useQuery, useQueries, type UseQueryOptions } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { queryKeys, type ReportingUnitsQueryParams } from './queryKeys';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ProblemDetails } from '@/config/api/types';
import type { CodeDescriptionDto, ReportingUnitSearchExpandedDto } from '@/services/search.types';
import type {
  ForestClientDto,
  MyForestClientDto,
  ReportingUnitSearchResultDto,
} from '@/services/types';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';
import API from '@/services/APIs';
import {
  forestClientAutocompleteResult2CodeDescription,
  generateSortArray,
} from '@/services/utils';

const REFERENCE_DATA_QUERY_CONFIG = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
} as const;

type CodeResource = 'samplingOptions' | 'districtOptions' | 'statusOptions';
type QueryNotificationOptions = {
  notificationTarget?: string;
};

const getProblemDetails = (error: Error) => {
  if (typeof error !== 'object' || error === null || !('body' in error)) {
    return undefined;
  }

  return (error as { body?: ProblemDetails }).body;
};

const notifyProblemDetailsError = (error: Error, eventTarget: string) => {
  const problemDetails = getProblemDetails(error);

  sendEvent({
    description: problemDetails
      ? problemDetails.detail || 'No additional details provided.'
      : error.message || 'No additional details provided.',
    displayMode: 'inline',
    eventTarget,
    eventType: 'error',
    title: problemDetails?.title || 'Request failed',
  });
};

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
    samplingOptions: () => API.codes.getSamplingOptions({ notificationTarget }),
    districtOptions: () => API.codes.getDistricts({ notificationTarget }),
    statusOptions: () => API.codes.getAssessAreaStatuses({ notificationTarget }),
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
 */
export const useWasteSearchFilterOptionsQueries = (notificationTarget?: string) => {
  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.codes.samplingOptions(notificationTarget),
        queryFn: () => API.codes.getSamplingOptions({ notificationTarget }),
        ...REFERENCE_DATA_QUERY_CONFIG,
      },
      {
        queryKey: queryKeys.codes.districtOptions(notificationTarget),
        queryFn: () => API.codes.getDistricts({ notificationTarget }),
        ...REFERENCE_DATA_QUERY_CONFIG,
      },
      {
        queryKey: queryKeys.codes.statusOptions(notificationTarget),
        queryFn: () => API.codes.getAssessAreaStatuses({ notificationTarget }),
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
    queryFn: () => API.codes.getDistricts(),
    ...REFERENCE_DATA_QUERY_CONFIG,
    ...options,
  });
};

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
    queryFn: () =>
      API.forestclient.searchByClientNumbers([...clientNumbers], 0, clientNumbers.length),
    enabled: clientNumbers.length > 0,
    ...options,
  });
};

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
    queryFn: () =>
      API.forestclient.searchMyForestClients(filter, page, size, {
        notificationTarget,
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
    queryFn: () =>
      API.search.searchReportingUnit(
        input.filters,
        {
          page: input.page,
          size: input.size,
          sort: generateSortArray<ReportingUnitSearchResultDto>(input.sort),
        },
        {
          notificationTarget,
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
    queryFn: () => {
      if (ruId === null || wasteAssessmentAreaId === null) {
        throw new Error('Reporting unit expand query requires both IDs.');
      }
      return API.search.getReportingUnitSearchExpand(ruId, wasteAssessmentAreaId);
    },
    enabled: ruId !== null && wasteAssessmentAreaId !== null,
    staleTime: Infinity,
    ...options,
  });
};

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
    queryFn: async () => {
      if (!clientCode) {
        return [];
      }

      return (await API.forestclient.searchForestClients(clientCode, 0, 1)).map(
        forestClientAutocompleteResult2CodeDescription,
      );
    },
    enabled: enabled && Boolean(clientCode),
    staleTime: Infinity,
    ...options,
  });
};
