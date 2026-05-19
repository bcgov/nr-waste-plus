import { ZodError } from 'zod';

import { reportingUnitSchema } from './reportingUnit.types';

import type { ReportingUnitDto } from './types';

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
  async getReportingUnit(id: number): Promise<ReportingUnitDto> {
    try {
      const raw = await this.doRequest<unknown>(this.config, {
        method: 'GET',
        url: `/api/reporting-units/${id}`,
      });
      return reportingUnitSchema.parse(raw);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new Error(`Reporting unit ${id} has an unexpected data structure: ${error.message}`);
      }
      throw error;
    }
  }
}
