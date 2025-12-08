import type { CodeDescriptionDto } from './types';
import type { CancelablePromise } from '@/config/api/CancelablePromise';

import { problemDetailsMiddleware } from '@/config/api/problemDetailsMiddleware';
import { HttpClient, type APIConfig } from '@/config/api/types';

export class CodesService extends HttpClient {
  constructor(readonly config: APIConfig) {
    super(config);
  }

  getSamplingOptions(): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/samplings',
      middleware: [problemDetailsMiddleware()],
    });
  }

  getDistricts(): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/districts',
      middleware: [problemDetailsMiddleware()],
    });
  }

  getAssessAreaStatuses(): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/assess-area-statuses',
      middleware: [problemDetailsMiddleware()],
    });
  }
}
