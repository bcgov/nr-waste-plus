import {
  useQuery,
  useQueries,
  type UseQueryOptions,
  useMutation,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  queryKeys,
  type DistrictVolumeQueryParams,
  type ReportingUnitsQueryParams,
  type SpeciesCompositionQueryParams,
} from './queryKeys';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ProblemDetails } from '@/config/api/types';
import type {
  DistrictVolumeCreate,
  DistrictVolumeDetail,
  DistrictVolumeListItem,
} from '@/services/districtvolumes.types';
import type { CodeDescriptionDto, ReportingUnitSearchExpandedDto } from '@/services/search.types';
import type {
  SpeciesCompositionCreate,
  SpeciesCompositionDetail,
  SpeciesCompositionListItem,
} from '@/services/speciescomposition/speciesComposition.types';
import type {
  ForestClientDto,
  MyForestClientDto,
  ReportingUnitCreateDto,
  ReportingUnitSearchResultDto,
} from '@/services/types';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';
import API from '@/services/APIs';
import {
  forestClientAutocompleteResult2CodeDescription,
  generateSortArray,
} from '@/services/utils';

/**
 * Shared TanStack Query options for reference-data requests.
 *
 * Reference data (codes, districts, statuses) rarely changes mid-session.
 * Using `staleTime: Infinity` prevents background refetches; the data is
 * still refreshed on mount and on network reconnect.
 */
const REFERENCE_DATA_QUERY_CONFIG = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
} as const;

/** One of the three waste-search filter code-list resources available via {@link useCodesQuery}. */
type CodeResource = 'samplingOptions' | 'districtOptions' | 'statusOptions';

/**
 * Options shared by hooks that support inline error notifications.
 * When `notificationTarget` is supplied, the hook fires a notification event
 * on query failure instead of (or in addition to) propagating the error state.
 */
type QueryNotificationOptions = {
  /** Target element identifier for inline error notifications. When omitted, no notification is dispatched. */
  notificationTarget?: string;
};

/**
 * Extracts a {@link ProblemDetails} payload from a thrown error object when one is present.
 *
 * TanStack Query wraps HTTP errors as plain `Error` instances; the underlying
 * `body` property carries the structured RFC 7807 problem details when the
 * backend returns one.
 *
 * @param error - The error thrown by a query function.
 * @returns The `ProblemDetails` body if present, otherwise `undefined`.
 */
const getProblemDetails = (error: Error) => {
  if (typeof error !== 'object' || error === null || !('body' in error)) {
    return undefined;
  }

  return (error as { body?: ProblemDetails }).body;
};

/**
 * Dispatches an inline error notification event for a failed query.
 *
 * Uses {@link getProblemDetails} to prefer structured RFC 7807 detail text;
 * falls back to `error.message` when no structured body is available.
 *
 * @param error - The error thrown by a query function.
 * @param eventTarget - Identifier for the notification target element.
 */
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
    queryFn: () => API.codes.getDistricts(),
    ...REFERENCE_DATA_QUERY_CONFIG,
    ...options,
  });
};

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
    queryFn: () =>
      API.forestclient.searchByClientNumbers([...clientNumbers], 0, clientNumbers.length),
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

/**
 * Creates a new reporting unit and returns the created resource ID.
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
    mutationFn: (body) => API.reportingUnit.createReportingUnit(body),
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
    queryFn: () => API.districtVolume.getDistrictVolumeTableDetail(id) as unknown as Promise<TData>,
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
    queryFn: () =>
      API.districtVolume.getDistrictVolumes(undefined, {
        page: input.page,
        size: input.size,
        sort: generateSortArray<DistrictVolumeListItem>(input.sort),
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
    mutationFn: (body) => API.districtVolume.createDistrictVolumeTable(body),
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
    queryFn: () =>
      API.speciesComposition.getSpeciesCompositionById(id) as unknown as Promise<TData>,
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
    queryFn: () =>
      API.speciesComposition.listSpeciesCompositions({
        page: input.page,
        size: input.size,
        sort: generateSortArray<SpeciesCompositionListItem>(input.sort),
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
    mutationFn: (body) => API.speciesComposition.createSpeciesComposition(body),
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
