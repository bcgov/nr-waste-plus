import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';

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
  }, [notificationTarget, query.error, query.isError]);

  return query;
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
