/**
 * DistrictVolumeResource — typed API resource for
 * `/api/configuration/district-average-volumes`.
 *
 * Framework-agnostic: TanStack Query hooks live in
 * `api/districtVolumes.ts`. All requests flow through the middleware
 * pipeline.
 *
 * @module api/resources/district-volume-resource
 */

import { parseResourceIdFromLocation } from '@/api/location';
import { removeEmpty } from '@/api/utils';
import { Resource } from '@/http/resource';

import type {
  DistrictVolumeCreate,
  DistrictVolumeDetail,
  DistrictVolumeListItem,
} from '@/api/districtvolumes.types';
import type { PageableRequest } from '@/api/pagination.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ResourceRequestOptions } from '@/http/resource';
import type { Transport } from '@/http/types';

/**
 * API resource for district average volume configuration endpoints.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class DistrictVolumeResource extends Resource<DistrictVolumeDetail> {
  constructor(transport: Transport) {
    super('/api/configuration/district-average-volumes', transport);
  }

  /**
   * Retrieves a paginated list of district volume configurations.
   *
   * @param area - Optional area filter (INTERIOR or COASTAL).
   * @param pageable - Pagination and sorting options.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getDistrictVolumes = (
    area: string | undefined,
    pageable: PageableRequest<DistrictVolumeListItem>,
    options?: ResourceRequestOptions,
  ): Promise<PageableResponse<DistrictVolumeListItem>> =>
    this.get<PageableResponse<DistrictVolumeListItem>>('', {
      ...options,
      params: {
        ...removeEmpty(pageable),
        ...(area ? { area } : {}),
      },
    });

  /**
   * Creates a district volume table and returns the new resource ID
   * parsed from the 201 `Location` header.
   *
   * Retries are disabled (`meta.maxRetries: 0` by default): a POST
   * replayed after an ambiguous network failure could duplicate the
   * record.
   *
   * @param dto - The district volume create payload.
   * @param options - Request options (AbortSignal, pipeline meta).
   * @throws {Error} When the response carries no parsable Location header.
   */
  readonly createDistrictVolumeTable = async (
    dto: DistrictVolumeCreate,
    options?: ResourceRequestOptions,
  ): Promise<number> => {
    const res = await this.request<unknown>('POST', '', {
      ...options,
      data: dto,
      meta: { maxRetries: 0, ...options?.meta },
    });

    const location = res.headers['location'];
    if (location === undefined) {
      throw new Error('Created district volume table response is missing a Location header');
    }
    return parseResourceIdFromLocation(location);
  };

  /**
   * Retrieves detailed information for a specific district volume configuration.
   *
   * @param id - The district volume configuration ID.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getDistrictVolumeTableDetail = (
    id: number,
    options?: ResourceRequestOptions,
  ): Promise<DistrictVolumeDetail> =>
    this.get<DistrictVolumeDetail>(`/${encodeURIComponent(String(id))}`, options);

  /**
   * Soft-deletes a future-dated district volume configuration.
   *
   * Only entries whose start date is strictly after the current business
   * date can be deleted; deleting a future entry reopens its predecessor.
   * The backend is authoritative for this rule and rejects non-future
   * entries with a 422, missing or hidden entries with a 404, and
   * temporal conflicts with a 409.
   *
   * @param id - The district volume configuration ID.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly deleteDistrictVolume = async (
    id: number,
    options?: ResourceRequestOptions,
  ): Promise<void> => {
    await this.request('DELETE', `/${encodeURIComponent(String(id))}`, options);
  };
}
