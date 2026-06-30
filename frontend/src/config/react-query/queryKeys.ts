import type { ReportingUnitSearchParametersDto, SortDirectionType } from '@/services/types';

/**
 * Parameters used to build the district-volume list query key and query function.
 */
export type DistrictVolumeQueryParams = {
  /** Zero-based page index. */
  page: number;
  /** Number of items per page. */
  size: number;
  /** Column sort configuration (`{ key: direction }`). */
  sort: Record<string, SortDirectionType>;
};

/**
 * Parameters used to build the reporting-units search query key and query function.
 *
 * Bundled as a single object so TanStack Query can treat all search variables
 * as one dependency unit; changing any field invalidates the cached query.
 */
export type ReportingUnitsQueryParams = {
  /** Zero-based page index. */
  page: number;
  /** Number of items per page. */
  size: number;
  /** Active filter criteria passed to the search API. */
  filters: ReportingUnitSearchParametersDto;
  /** Column sort configuration (`{ key: direction }`). */
  sort: Record<string, SortDirectionType>;
};

/**
 * Centralised query-key factory for all TanStack Query caches in the application.
 *
 * Each key is a `const` tuple so that TypeScript can narrow the exact key type
 * used when calling `queryClient.invalidateQueries` or `queryClient.getQueryData`.
 *
 * Namespaces:
 * - `codes` — Reference-data code lists (sampling options, districts, statuses).
 * - `preference` — Authenticated user preferences.
 * - `search` — Reporting-unit search and expand queries.
 * - `forestClient` — Forest-client lookup and listing.
 * - `autocomplete` — Generic field autocomplete suggestions.
 * - `reportingUnit` — Individual reporting-unit detail queries.
 * - `table` — Persisted table sorting state.
 *
 * `notificationTarget` params (where present) are included in the key so that
 * different notification targets produce isolated cache entries.
 */
export const queryKeys = {
  codes: {
    samplingOptions: (notificationTarget?: string) =>
      ['codes', 'sampling-options', notificationTarget] as const,
    districtOptions: (notificationTarget?: string) =>
      ['codes', 'district-options', notificationTarget] as const,
    statusOptions: (notificationTarget?: string) =>
      ['codes', 'status-options', notificationTarget] as const,
  },
  preference: {
    userPreference: () => ['preference', 'user'] as const,
  },
  search: {
    reportingUnits: (params: ReportingUnitsQueryParams, notificationTarget?: string) =>
      ['search', 'reporting-units', params, notificationTarget] as const,
    reportingUnitExpand: (
      rowId: string,
      ruId: number | null,
      wasteAssessmentAreaId: number | null,
    ) => ['search', 'reporting-unit-expand', { rowId, ruId, wasteAssessmentAreaId }] as const,
    reportingUnitUsers: (value: string) => ['search', 'reporting-unit-users', value] as const,
  },
  forestClient: {
    byClientNumbers: (clientNumbers: readonly string[]) =>
      ['forest-client', 'by-client-numbers', [...clientNumbers]] as const,
    myForestClients: (filter: string, page: number, size: number, notificationTarget?: string) =>
      ['forest-client', 'my-forest-clients', { filter, page, size }, notificationTarget] as const,
    lookupByClientCode: (clientCode: string) =>
      ['forest-client', 'lookup-by-client-code', clientCode] as const,
  },
  autocomplete: {
    byFieldAndValue: (id: string, value: string) => ['autocomplete', id, value] as const,
  },
  reportingUnit: {
    details: (ruId: number) => ['reporting-unit', 'details', ruId] as const,
    create: () => ['reporting-unit', 'create'] as const,
  },
  table: {
    sorting: (sort: Record<string, SortDirectionType>) => ['table', 'sorting', sort] as const,
  },
  districtVolume: {
    list: (params: DistrictVolumeQueryParams, notificationTarget?: string) =>
      ['district-volume', 'list', params, notificationTarget] as const,
    create: () => ['district-volume', 'create'] as const,
    detail: (id: number) => ['district-volume', 'detail', id] as const,
  },
} as const;
