import type { ReportingUnitSearchParametersDto, SortDirectionType } from '@/services/types';

export type ReportingUnitsQueryParams = {
  page: number;
  size: number;
  filters: ReportingUnitSearchParametersDto;
  sort: Record<string, SortDirectionType>;
};

export const queryKeys = {
  codes: {
    samplingOptions: (notificationTarget?: string) => ['codes', 'sampling-options', notificationTarget] as const,
    districtOptions: (notificationTarget?: string) => ['codes', 'district-options', notificationTarget] as const,
    statusOptions: (notificationTarget?: string) => ['codes', 'status-options', notificationTarget] as const,
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
  },
  table: {
    sorting: (sort: Record<string, SortDirectionType>) => ['table', 'sorting', sort] as const,
  },
} as const;
