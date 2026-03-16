import { removeEmpty } from './utils';

import type {
  PageableRequest,
  ReportingUnitSearchExpandedDto,
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchResultDto,
} from './types';
import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { CancelablePromise } from '@/config/api/CancelablePromise';

import { problemDetailsMiddleware } from '@/config/api/problemDetailsMiddleware';
import { HttpClient, type APIConfig } from '@/config/api/types';

/**
 * Backend client for reporting unit search endpoints.
 */
export class SearchService extends HttpClient {
  /**
   * Creates a reporting-unit search service.
   *
   * @param config The API client configuration.
   */
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Searches reporting units using filter and pagination inputs.
   *
   * @param filters Search filters to send to the backend.
   * @param pageable Pagination and sorting options.
   * @returns A paged reporting-unit search result.
   */
  searchReportingUnit(
    filters: ReportingUnitSearchParametersDto,
    pageable: PageableRequest<ReportingUnitSearchResultDto>,
  ): CancelablePromise<PageableResponse<ReportingUnitSearchResultDto>> {
    return this.doRequest<PageableResponse<ReportingUnitSearchResultDto>>(this.config, {
      method: 'GET',
      url: '/api/search/reporting-units',
      query: { ...removeEmpty(filters), ...removeEmpty(pageable) },
      middleware: [problemDetailsMiddleware()],
    });
  }

  /**
   * Loads the expanded reporting-unit payload for a table row.
   *
   * @param ruId The reporting unit identifier.
   * @param wasteAssessmentAreaId The waste assessment area identifier.
   * @returns The expanded reporting-unit detail payload.
   */
  getReportingUnitSearchExpand(
    ruId: number,
    wasteAssessmentAreaId: number,
  ): CancelablePromise<ReportingUnitSearchExpandedDto> {
    return this.doRequest<ReportingUnitSearchExpandedDto>(this.config, {
      method: 'GET',
      url: `/api/search/reporting-units/ex/${ruId}/${wasteAssessmentAreaId}`,
      middleware: [problemDetailsMiddleware()],
    });
  }

  /**
   * Looks up reporting units associated with a user identifier.
   *
   * @param userId The user identifier to search for.
   * @returns Matching reporting-unit user identifiers.
   */
  searchReportingUnitUsers(userId: string): CancelablePromise<string[]> {
    return this.doRequest<string[]>(this.config, {
      method: 'GET',
      url: '/api/search/reporting-units-users',
      query: { userId },
      middleware: [problemDetailsMiddleware()],
    });
  }
}
