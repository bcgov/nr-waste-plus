/**
 * SpeciesCompositionResource — typed API resource for
 * `/api/configuration/species-compositions`.
 *
 * Framework-agnostic: TanStack Query hooks live in
 * `api/speciesCompositions.ts`. All requests flow through the middleware
 * pipeline.
 *
 * @module api/resources/species-composition-resource
 */

import { parseResourceIdFromLocation } from '@/api/location';
import { removeEmpty } from '@/api/utils';
import { Resource } from '@/http/resource';

import type { PageableRequest } from '@/api/pagination.types';
import type {
  SpeciesCompositionCreate,
  SpeciesCompositionDetail,
  SpeciesCompositionListItem,
} from '@/api/speciesComposition.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ResourceRequestOptions } from '@/http/resource';
import type { Transport } from '@/http/types';

/**
 * API resource for district-level species composition configuration endpoints.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class SpeciesCompositionResource extends Resource<SpeciesCompositionDetail> {
  constructor(transport: Transport) {
    super('/api/configuration/species-compositions', transport);
  }

  /**
   * Retrieves a paginated list of species composition configurations.
   *
   * @param pageable - Pagination and sorting options.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly listSpeciesCompositions = (
    pageable: PageableRequest<SpeciesCompositionListItem>,
    options?: ResourceRequestOptions,
  ): Promise<PageableResponse<SpeciesCompositionListItem>> =>
    this.get<PageableResponse<SpeciesCompositionListItem>>('', {
      ...options,
      params: { ...removeEmpty(pageable) },
    });

  /**
   * Retrieves detailed information for a specific species composition configuration.
   *
   * @param id - The species composition configuration ID.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getSpeciesCompositionById = (
    id: number,
    options?: ResourceRequestOptions,
  ): Promise<SpeciesCompositionDetail> =>
    this.get<SpeciesCompositionDetail>(`/${encodeURIComponent(String(id))}`, options);

  /**
   * Creates a new species composition table and returns the created
   * resource ID parsed from the 201 `Location` header.
   *
   * Retries are disabled (`meta.maxRetries: 0` by default): a POST
   * replayed after an ambiguous network failure could duplicate the
   * record.
   *
   * @param dto - The species composition create payload.
   * @param options - Request options (AbortSignal, pipeline meta).
   * @throws {Error} When the response carries no parsable Location header.
   */
  readonly createSpeciesComposition = async (
    dto: SpeciesCompositionCreate,
    options?: ResourceRequestOptions,
  ): Promise<number> => {
    const res = await this.request<unknown>('POST', '', {
      ...options,
      data: dto,
      meta: { maxRetries: 0, ...options?.meta },
    });

    const location = res.headers['location'];
    if (location === undefined) {
      throw new Error('Created species composition response is missing a Location header');
    }
    return parseResourceIdFromLocation(location);
  };

  /**
   * Soft-deletes a future-dated species composition configuration.
   *
   * Only entries whose start date is strictly after the current business
   * date can be deleted; deleting a future entry reopens its predecessor.
   * The backend is authoritative for this rule and rejects non-future
   * entries with a 422, missing or hidden entries with a 404, and
   * temporal conflicts with a 409.
   *
   * @param id - The species composition configuration ID.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly deleteSpeciesComposition = async (
    id: number,
    options?: ResourceRequestOptions,
  ): Promise<void> => {
    await this.request('DELETE', `/${encodeURIComponent(String(id))}`, options);
  };
}
