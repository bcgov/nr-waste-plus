import { HttpClient, type APIConfig } from '@/config/api/types';

import type {
  CodeDescriptionDto,
  ForestClientAutocompleteResultDto,
  ForestClientDistrictDto,
  ForestClientDto,
} from './types';
import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { CancelablePromise } from '@/config/api/CancelablePromise';

/**
 * Service that interacts with forest client-related API endpoints.
 */
export class ForestClientService extends HttpClient {
  /**
   * Creates an instance of ForestClientService.
   * @param config API configuration object
   */
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Retrieves a forest client by client number.
   * @param clientNumber The client number to look up
   * @returns Promise resolving to a ForestClientDto
   */
  getForestClient(clientNumber: string): CancelablePromise<ForestClientDto> {
    return this.doRequest(this.config, {
      method: 'GET',
      url: '/api/forest-clients/{clientNumber}',
      path: {
        clientNumber: clientNumber,
      },
    });
  }

  /**
   * Retrieves the locations for a given forest client.
   * @param clientNumber The client number to look up locations for
   * @returns Promise resolving to an array of CodeDescriptionDto
   */
  getForestClientLocations(clientNumber: string): CancelablePromise<Array<CodeDescriptionDto>> {
    return this.doRequest(this.config, {
      method: 'GET',
      url: '/api/forest-clients/{clientNumber}/locations',
      path: {
        clientNumber: clientNumber,
      },
    });
  }

  /**
   * Searches for forest clients by name, acronym, or number.
   * @param value The search value (name, acronym, or number)
   * @param page Optional page number for pagination
   * @param size Optional page size (default: 10)
   * @returns Promise resolving to an array of ForestClientAutocompleteResultDto
   */
  searchForestClients(
    value: string,
    page?: number,
    size: number = 10,
  ): CancelablePromise<Array<ForestClientAutocompleteResultDto>> {
    return this.doRequest<Array<ForestClientAutocompleteResultDto>>(this.config, {
      method: 'GET',
      url: '/api/forest-clients/byNameAcronymNumber',
      query: {
        page: page,
        size: size,
        value: value,
      },
    });
  }

  /**
   * Searches for forest clients by an array of client numbers.
   * @param values Array of client numbers to search for
   * @param page Optional page number for pagination (default: 0)
   * @param size Optional page size (default: 10)
   * @returns Promise resolving to an array of ForestClientDto
   */
  searchByClientNumbers(
    values: string[],
    page: number = 0,
    size: number = 10,
  ): CancelablePromise<Array<ForestClientDto>> {
    return this.doRequest<Array<ForestClientDto>>(this.config, {
      method: 'GET',
      url: '/api/forest-clients/searchByNumbers',
      query: {
        page,
        size,
        values,
      },
    });
  }

  /**
   * Searches for forest client districts by value.
   * @param value The search value for the district
   * @param page Optional page number for pagination
   * @param size Optional page size (default: 10)
   * @returns Promise resolving to an array of ForestClientDistrictDto
   */
  searchForestClientsDistricts(
    value: string,
    page?: number,
    size: number = 10,
  ): CancelablePromise<PageableResponse<ForestClientDistrictDto>> {
    return this.doRequest<PageableResponse<ForestClientDistrictDto>>(this.config, {
      method: 'GET',
      url: '/api/forest-clients/districts',
      query: {
        page: page,
        size: size,
        value: value,
      },
    });
  }
}
