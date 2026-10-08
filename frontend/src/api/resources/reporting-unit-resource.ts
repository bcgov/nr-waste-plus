/**
 * ReportingUnitResource — typed API resource for `/api/reporting-units`.
 *
 * Framework-agnostic: TanStack Query hooks live in
 * `api/reportingUnits.ts`. All requests flow through the middleware
 * pipeline.
 *
 * @module api/resources/reporting-unit-resource
 */

import { parseResourceIdFromLocation } from '@/api/location';
import { Resource } from '@/http/resource';

import type { ResourceRequestOptions } from '@/http/resource';
import type { Transport } from '@/http/types';
import type { ReportingUnitCreateDto, ReportingUnitDto } from '@/api/types';

/**
 * API resource for reporting-unit endpoints.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class ReportingUnitResource extends Resource<ReportingUnitDto> {
  constructor(transport: Transport) {
    super('/api/reporting-units', transport);
  }

  /**
   * Retrieves a reporting unit by ID.
   *
   * @param id - The ID of the reporting unit.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getReportingUnit = (
    id: number,
    options?: ResourceRequestOptions,
  ): Promise<ReportingUnitDto> =>
    this.get<ReportingUnitDto>(`/${encodeURIComponent(String(id))}`, options);

  /**
   * Creates a new reporting unit and returns its numeric ID.
   *
   * The backend returns HTTP 201 (Created) with a `Location` header
   * pointing to `/reporting-units/{id}`; the ID is parsed from that
   * header for immediate navigation.
   *
   * Retries are disabled (`meta.maxRetries: 0` by default): a POST
   * replayed after an ambiguous network failure could duplicate the
   * record. Callers may override via `options.meta` if ever needed.
   *
   * @param body - The create request payload.
   * @param options - Request options (AbortSignal, pipeline meta).
   * @returns The numeric ID of the created reporting unit.
   * @throws {Error} When the response carries no parsable Location header.
   */
  readonly createReportingUnit = async (
    body: ReportingUnitCreateDto,
    options?: ResourceRequestOptions,
  ): Promise<number> => {
    const res = await this.request<unknown>('POST', '', {
      ...options,
      data: body,
      meta: { maxRetries: 0, ...options?.meta },
    });

    const location = res.headers['location'];
    if (location === undefined) {
      throw new Error('Created reporting unit response is missing a Location header');
    }
    return parseResourceIdFromLocation(location);
  };
}
