/**
 * CodesResource — typed API resource for `/api/codes` reference data.
 *
 * Framework-agnostic: TanStack Query hooks live in `api/codes.ts` and
 * call these methods. All requests flow through the middleware pipeline.
 *
 * @module api/resources/codes-resource
 */

import { Resource } from '@/http/resource';

import type { CodeDescriptionDto } from '@/api/search.types';
import type { ResourceRequestOptions } from '@/http/resource';
import type { Transport } from '@/http/types';

/**
 * API resource for the reference-data code tables.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class CodesResource extends Resource<CodeDescriptionDto> {
  constructor(transport: Transport) {
    super('/api/codes', transport);
  }

  /**
   * Loads available sampling options.
   *
   * @param options - Request options (AbortSignal, pipeline meta).
   * @returns The sampling code descriptions.
   */
  readonly getSamplingOptions = (options?: ResourceRequestOptions): Promise<CodeDescriptionDto[]> =>
    this.get<CodeDescriptionDto[]>('/samplings', options);

  /**
   * Loads the district list used by the application.
   *
   * @param options - Request options (AbortSignal, pipeline meta).
   * @returns The district code descriptions.
   */
  readonly getDistricts = (options?: ResourceRequestOptions): Promise<CodeDescriptionDto[]> =>
    this.get<CodeDescriptionDto[]>('/districts', options);

  /**
   * Loads available assessment area status values.
   *
   * @param options - Request options (AbortSignal, pipeline meta).
   * @returns The assessment area status code descriptions.
   */
  readonly getAssessAreaStatuses = (
    options?: ResourceRequestOptions,
  ): Promise<CodeDescriptionDto[]> =>
    this.get<CodeDescriptionDto[]>('/assess-area-statuses', options);
}
