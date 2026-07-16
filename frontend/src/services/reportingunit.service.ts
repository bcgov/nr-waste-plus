import type { ReportingUnitCreateDto, ReportingUnitDto } from './types';

import { CancelablePromise } from '@/config/api/CancelablePromise';
import { HttpClient, type APIConfig } from '@/config/api/types';

/**
 * Backend client for Reporting Unit data.
 *
 * Extends {@link HttpClient} to provide typed, schema-validated access to the
 * `/api/reporting-units` backend resource. Validates all responses at runtime
 * using Zod to surface unexpected API shape changes early.
 */
export class ReportingUnitService extends HttpClient {
  /**
   * @param config - API configuration for the reporting-unit backend resource.
   */
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Retrieves a reporting unit by ID.
   *
   * Validates the API response against the {@link reportingUnitSchema} at runtime
   * to catch unexpected shape changes from the backend early.
   *
   * @param id - The ID of the reporting unit.
   * @returns A promise that resolves to the validated reporting unit details.
   * @throws {Error} When the API response does not match the expected schema.
   * @throws {ApiError} When the HTTP request fails.
   */
  getReportingUnit(id: number): CancelablePromise<ReportingUnitDto> {
    return this.doRequest<ReportingUnitDto>(this.config, {
      method: 'GET',
      url: `/api/reporting-units/${id}`,
    });
  }

  /**
   * Creates a new reporting unit and returns its numeric ID.
   *
   * The backend returns HTTP 201 (Created) with a `Location` header pointing to
   * `/reporting-units/{id}`. This method extracts the ID from that header and
   * returns it as a number for immediate navigation.
   *
   * @param body - The create request payload.
   * @returns A promise that resolves to the numeric ID of the created reporting unit.
   * @throws {ApiError} When the HTTP request fails (400, 409, 500, etc.).
   */
  createReportingUnit(body: ReportingUnitCreateDto): CancelablePromise<number> {
    return this.createResource({
      method: 'POST',
      url: '/api/reporting-units',
      body,
    });
  }
}
