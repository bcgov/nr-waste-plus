import type { CodeDescriptionDto } from './types';
import type { CancelablePromise } from '@/config/api/CancelablePromise';

import { HttpClient, type APIConfig } from '@/config/api/types';

export class CodesService extends HttpClient {
  constructor(readonly config: APIConfig) {
    super(config);
  }

  getSamplingOptions(): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/samplings',
    });
  }

  getDistricts(): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/districts',
    });
  }

  getAssessAreaStatuses(): CancelablePromise<CodeDescriptionDto[]> {
    return this.doRequest<CodeDescriptionDto[]>(this.config, {
      method: 'GET',
      url: '/api/codes/assess-area-statuses',
    });
  }
}
