import { removeEmpty } from './utils';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type {
  SpeciesCompositionCreate,
  SpeciesCompositionDetail,
  SpeciesCompositionListItem,
  PageableRequest,
} from '@/services/types';

import { CancelablePromise } from '@/config/api/CancelablePromise';
import { HttpClient, type APIConfig } from '@/config/api/types';

/**
 * Backend client for district level species composition configuration endpoints.
 */
export class SpeciesCompositionService extends HttpClient {
  /**
   * Creates a species composition service.
   *
   * @param config The API client configuration.
   */
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Retrieves a paginated list of species composition configurations.
   *
   * @param pageable Pagination and sorting options.
   * @param meta Optional request metadata.
   * @returns A paged list of species composition items.
   */
  listSpeciesCompositions(
    pageable: PageableRequest<SpeciesCompositionListItem>,
    meta?: Record<string, unknown>,
  ): CancelablePromise<PageableResponse<SpeciesCompositionListItem>> {
    return this.doRequest<PageableResponse<SpeciesCompositionListItem>>(this.config, {
      method: 'GET',
      url: '/api/configuration/species-compositions',
      query: {
        ...removeEmpty(pageable),
      },
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Retrieves detailed information for a specific species composition configuration.
   *
   * @param id The species composition configuration ID.
   * @param meta Optional request metadata.
   * @returns The detailed species composition configuration.
   */
  getSpeciesCompositionById(
    id: number,
    meta?: Record<string, unknown>,
  ): CancelablePromise<SpeciesCompositionDetail> {
    return this.doRequest<SpeciesCompositionDetail>(this.config, {
      method: 'GET',
      url: `/api/configuration/species-compositions/${id}`,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Creates a new species composition table and returns the created resource ID.
   *
   * The backend returns HTTP 201 (Created) with a Location header pointing to the
   * created resource. This method delegates to `createResource`, which extracts
   * and parses that header (via `parseResourceIdFromLocation`) to return the
   * numeric ID, mirroring the district volume create behaviour.
   *
   * @param dto The species composition create payload.
   * @param meta Optional request metadata.
   * @returns The numeric ID of the created species composition configuration.
   */
  createSpeciesComposition(
    dto: SpeciesCompositionCreate,
    meta?: Record<string, unknown>,
  ): CancelablePromise<number> {
    return this.createResource({
      method: 'POST',
      url: '/api/configuration/species-compositions',
      body: dto,
      ...(meta === undefined ? {} : { meta }),
    });
  }
}
