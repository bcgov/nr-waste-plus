import { HttpClient, type APIConfig } from '@/config/api/types';

import type { CancelablePromise } from '@/config/api/CancelablePromise';
import type { CodeDescriptionDto } from '@/types/search.types';

/**
 * Optional reporting-unit/block context used to resolve harvest-status variants.
 */
export type HarvestStatusCodesParams = {
  /** Reporting unit identifier for variant resolution. */
  readonly reportingUnitId?: number;
  /** Block identifier for variant resolution. */
  readonly blockId?: number;
};

/**
 * Backend client for reference data and code table endpoints.
 */
export class CodesService extends HttpClient {
  /**
   * Creates a code-table service.
   *
   * @param config The API client configuration.
   */
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Loads available sampling options.
   *
   * @param meta Optional metadata to pass through the request pipeline.
   * @returns The sampling code descriptions.
   */
  getSamplingOptions(meta?: Record<string, unknown>): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/samplings',
      ...(meta !== undefined ? { meta } : {}),
    });
  }

  /**
   * Loads the district list used by the application.
   *
   * @param meta Optional metadata to pass through the request pipeline.
   * @returns The district code descriptions.
   */
  getDistricts(meta?: Record<string, unknown>): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/districts',
      ...(meta !== undefined ? { meta } : {}),
    });
  }

  /**
   * Loads available assessment area status values.
   *
   * @param meta Optional metadata to pass through the request pipeline.
   * @returns The assessment area status code descriptions.
   */
  getAssessAreaStatuses(meta?: Record<string, unknown>): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/assess-area-statuses',
      ...(meta !== undefined ? { meta } : {}),
    });
  }

  /**
   * Loads harvest status code options for block details.
   *
   * When `reportingUnitId` and/or `blockId` are provided, the backend may resolve
   * coast/interior variants and apply allowlists. When context is unresolved or
   * unavailable, the backend falls back to unfiltered options.
   *
   * @param params Optional reporting-unit/block context for variant resolution.
   * @param meta Optional metadata to pass through the request pipeline.
   * @returns The harvest status code descriptions.
   */
  getHarvestStatusCodes(
    params?: HarvestStatusCodesParams,
    meta?: Record<string, unknown>,
  ): CancelablePromise<CodeDescriptionDto[]> {
    const query: Record<string, number> = {};
    if (params?.reportingUnitId !== undefined) {
      query.reportingUnitId = params.reportingUnitId;
    }
    if (params?.blockId !== undefined) {
      query.blockId = params.blockId;
    }

    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/harvest-statuses',
      ...(Object.keys(query).length > 0 ? { query } : {}),
      ...(meta !== undefined ? { meta } : {}),
    });
  }

  /**
   * Loads maturity type code options for block details.
   *
   * @param meta Optional metadata to pass through the request pipeline.
   * @returns The maturity type code descriptions.
   */
  getMaturityTypeCodes(meta?: Record<string, unknown>): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/maturity-types',
      ...(meta !== undefined ? { meta } : {}),
    });
  }
}
