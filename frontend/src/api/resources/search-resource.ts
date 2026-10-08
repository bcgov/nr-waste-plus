/**
 * SearchResource — typed API resource for `/api/search` endpoints.
 *
 * Framework-agnostic: TanStack Query hooks live in `api/search.ts` and
 * call these methods. All requests flow through the middleware pipeline.
 *
 * @module api/resources/search-resource
 */

import { removeEmpty } from '@/api/utils';
import { Resource } from '@/http/resource';

import type { PageableRequest } from '@/api/pagination.types';
import type {
  ReportingUnitSearchExpandedDto,
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchResultDto,
} from '@/api/search.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ResourceRequestOptions } from '@/http/resource';
import type { Transport } from '@/http/types';

/**
 * API resource for reporting-unit search endpoints.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class SearchResource extends Resource<ReportingUnitSearchResultDto> {
  constructor(transport: Transport) {
    super('/api/search', transport);
  }

  /**
   * Searches reporting units using filter and pagination inputs.
   *
   * Empty filter/pagination values are stripped before serialisation so
   * the query string matches the pre-migration wire format exactly.
   *
   * @param filters - Search filters to send to the backend.
   * @param pageable - Pagination and sorting options.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly searchReportingUnit = (
    filters: ReportingUnitSearchParametersDto,
    pageable: PageableRequest<ReportingUnitSearchResultDto>,
    options?: ResourceRequestOptions,
  ): Promise<PageableResponse<ReportingUnitSearchResultDto>> =>
    this.get<PageableResponse<ReportingUnitSearchResultDto>>('/reporting-units', {
      ...options,
      params: { ...removeEmpty(filters), ...removeEmpty(pageable) },
    });

  /**
   * Loads the expanded reporting-unit payload for a table row.
   *
   * @param ruId - The reporting unit identifier.
   * @param wasteAssessmentAreaId - The waste assessment area identifier.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getReportingUnitSearchExpand = (
    ruId: number,
    wasteAssessmentAreaId: number,
    options?: ResourceRequestOptions,
  ): Promise<ReportingUnitSearchExpandedDto> =>
    this.get<ReportingUnitSearchExpandedDto>(
      `/reporting-units/ex/${encodeURIComponent(String(ruId))}/${encodeURIComponent(String(wasteAssessmentAreaId))}`,
      options,
    );

  /**
   * Looks up reporting-unit submitters associated with a user identifier.
   *
   * @param userId - The user identifier to search for.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly searchReportingUnitUsers = (
    userId: string,
    options?: ResourceRequestOptions,
  ): Promise<string[]> =>
    this.get<string[]>('/reporting-units-users', {
      ...options,
      params: { userId },
    });
}
