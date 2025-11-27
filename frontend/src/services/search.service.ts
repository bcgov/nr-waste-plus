import { removeEmpty } from './utils';

import type {
  PageableRequest,
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchResultDto,
} from './types';
import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { CancelablePromise } from '@/config/api/CancelablePromise';

import { HttpClient, type APIConfig } from '@/config/api/types';

export class SearchService extends HttpClient {
  constructor(readonly config: APIConfig) {
    super(config);
  }

  searchReportingUnit(
    filters: ReportingUnitSearchParametersDto,
    pageable: PageableRequest<ReportingUnitSearchResultDto>,
  ): CancelablePromise<PageableResponse<ReportingUnitSearchResultDto>> {
    return this.doRequest<PageableResponse<ReportingUnitSearchResultDto>>(this.config, {
      method: 'GET',
      url: '/api/search/reporting-units',
      query: { ...removeEmpty(filters), ...removeEmpty(pageable) },
    });
  }

  searchReportingUnitUsers(userId: string): CancelablePromise<string[]> {
    return this.doRequest<string[]>(this.config, {
      method: 'GET',
      url: '/api/search/reporting-units-users',
      query: { userId },
    });
  }
}
