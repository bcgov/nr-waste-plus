import type { ReportingUnitDto } from './types';
import type { CancelablePromise } from '@/config/api/CancelablePromise';

import { HttpClient, type APIConfig } from '@/config/api/types';

/**
 * Backend client for Reporting Unit data.
 */
export class ReportingUnitService extends HttpClient {
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Retrieves a reporting unit by ID.
   *
   * @param id - The ID of the reporting unit.
   * @returns A promise that resolves to the reporting unit details.
   */
  getReportingUnit(id: number): CancelablePromise<ReportingUnitDto> {
    return this.doRequest<ReportingUnitDto>(this.config, {
      method: 'GET',
      url: `/api/reporting-units/${id}`,
    });
  }
}
