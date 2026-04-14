import type { ReportingUnitSearchParametersDto, SortDirectionType } from '@/services/types';

export type ReportingUnitsQueryParams = {
  page: number;
  size: number;
  filters: ReportingUnitSearchParametersDto;
  sort: Record<string, SortDirectionType>;
};

export const queryKeys = {
  codes: {
    samplingOptions: () => ['codes', 'sampling-options'] as const,
    districtOptions: () => ['codes', 'district-options'] as const,
    statusOptions: () => ['codes', 'status-options'] as const,
  },
  preference: {
    userPreference: () => ['preference', 'user'] as const,
  },
  search: {
    reportingUnits: (params: ReportingUnitsQueryParams) =>
      ['search', 'reporting-units', params] as const,
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
    myForestClients: (filter: string, page: number, size: number) =>
      ['forest-client', 'my-forest-clients', { filter, page, size }] as const,
    lookupByClientCode: (clientCode: string) =>
      ['forest-client', 'lookup-by-client-code', clientCode] as const,
  },
  autocomplete: {
    byFieldAndValue: (id: string, value: string) => ['autocomplete', id, value] as const,
  },
  table: {
    sorting: (sort: Record<string, SortDirectionType>) => ['table', 'sorting', sort] as const,
  },
} as const;
