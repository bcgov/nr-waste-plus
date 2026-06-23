import { removeEmpty } from './utils';

import type { DistrictVolumeListItem } from './districtvolumes.types';
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
      ...(meta !== undefined ? { meta } : {}),
    });
  }

  createDistrictVolumeTable(
    dto: import('@/services/districtvolumes.types').DistrictVolumeCreate,
    meta?: Record<string, unknown>,
  ): CancelablePromise<number> {
    return new CancelablePromise<number>((resolve, reject, onCancel) => {
      const request = this.doRequest<string>(this.config, {
        method: 'POST',
        url: '/api/configuration/district-average-volumes',
        body: dto,
        responseHeader: 'location',
        ...(meta !== undefined ? { meta } : {}),
      });

      onCancel(() => request.cancel());

      request
        .then((location) => {
          const match = location.match(/\/(\d+)$/);
          if (match) {
            resolve(Number(match[1]));
          } else {
            resolve(0);
          }
        })
        .catch(reject);
    });
  }
}
