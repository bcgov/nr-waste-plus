import type { CodeDescriptionDto } from './types';
import type { CancelablePromise } from '@/config/api/CancelablePromise';

import { problemDetailsMiddleware } from '@/config/api/problemDetailsMiddleware';
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
   * @returns The sampling code descriptions.
   */
  getSamplingOptions(): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/samplings',
      middleware: [problemDetailsMiddleware()],
    });
  }

  /**
   * Loads the district list used by the application.
   *
   * @returns The district code descriptions.
   */
  getDistricts(): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/districts',
      middleware: [problemDetailsMiddleware()],
    });
  }

  /**
   * Loads available assessment area status values.
   *
   * @returns The assessment area status code descriptions.
   */
  getAssessAreaStatuses(): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/assess-area-statuses',
      middleware: [problemDetailsMiddleware()],
    });
  }
}
