import { removeEmpty } from './utils';

import type {
  DistrictVolumeCreate,
  DistrictVolumeDetail,
  DistrictVolumeListItem,
} from './districtvolumes.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { PageableRequest } from '@/services/types';

import { CancelablePromise } from '@/config/api/CancelablePromise';
import { HttpClient, type APIConfig } from '@/config/api/types';

/**
 * Backend client for district average volume configuration endpoints.
 */
export class DistrictVolumeService extends HttpClient {
  /**
   * Creates a district volume service.
   *
   * @param config The API client configuration.
   */
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Retrieves a paginated list of district volume configurations.
   *
   * @param area Optional area filter (INTERIOR or COASTAL).
   * @param pageable Pagination and sorting options.
   * @param meta Optional request metadata.
   * @returns A paged list of district volume items.
   */
  getDistrictVolumes(
    area: string | undefined,
    pageable: PageableRequest<DistrictVolumeListItem>,
    meta?: Record<string, unknown>,
  ): CancelablePromise<PageableResponse<DistrictVolumeListItem>> {
    return this.doRequest<PageableResponse<DistrictVolumeListItem>>(this.config, {
      method: 'GET',
      url: '/api/configuration/district-average-volumes',
      query: {
        ...removeEmpty(pageable),
        ...(area ? { area } : {}),
      },
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Creates a district volume table and returns the new resource ID.
   *
   * @param dto - the district volume create payload
   * @param meta - optional request metadata
   * @returns a promise that resolves to the numeric ID of the created table
   * @throws {ApiError} When the HTTP request fails (400, 409, 500, etc.)
   */
  createDistrictVolumeTable(
    dto: DistrictVolumeCreate,
    meta?: Record<string, unknown>,
  ): CancelablePromise<number> {
    return this.createResource({
      method: 'POST',
      url: '/api/configuration/district-average-volumes',
      body: dto,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Retrieves detailed information for a specific district volume configuration.
   *
   * @param id The district volume configuration ID.
   * @param meta Optional request metadata.
   * @returns The detailed district volume configuration.
   */
  getDistrictVolumeTableDetail(
    id: number,
    meta?: Record<string, unknown>,
  ): CancelablePromise<DistrictVolumeDetail> {
    return this.doRequest<DistrictVolumeDetail>(this.config, {
      method: 'GET',
      url: `/api/configuration/district-average-volumes/${id}`,
      ...(meta === undefined ? {} : { meta }),
    });
  }
}
