import type { CodeDescriptionDto } from './types';
import type { CancelablePromise } from '@/config/api/CancelablePromise';

import { HttpClient, type APIConfig } from '@/config/api/types';

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
}
