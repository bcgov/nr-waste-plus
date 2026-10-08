/**
 * ForestClientResource — typed API resource for `/api/forest-clients`.
 *
 * Framework-agnostic: TanStack Query hooks live in `api/forestClients.ts`
 * and call these methods. All requests flow through the middleware
 * pipeline.
 *
 * @module api/resources/forest-client-resource
 */

import { Resource } from '@/http/resource';

import type {
  ForestClientAutocompleteResultDto,
  ForestClientDto,
  MyForestClientDto,
} from '@/api/forestclient.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ResourceRequestOptions } from '@/http/resource';
import type { Transport } from '@/http/types';

/**
 * API resource for forest-client lookup endpoints.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class ForestClientResource extends Resource<ForestClientDto> {
  constructor(transport: Transport) {
    super('/api/forest-clients', transport);
  }

  /**
   * Retrieves a forest client by client number.
   *
   * @param clientNumber - The client number to look up.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getForestClient = (
    clientNumber: string,
    options?: ResourceRequestOptions,
  ): Promise<ForestClientDto> =>
    this.get<ForestClientDto>(`/${encodeURIComponent(clientNumber)}`, options);

  /**
   * Searches for forest clients by name, acronym, or number.
   *
   * @param value - The search value (name, acronym, or number).
   * @param page - Optional page number for pagination.
   * @param size - Page size (default: 10).
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly searchForestClients = (
    value: string,
    page?: number,
    size: number = 10,
    options?: ResourceRequestOptions,
  ): Promise<ForestClientAutocompleteResultDto[]> =>
    this.get<ForestClientAutocompleteResultDto[]>('/byNameAcronymNumber', {
      ...options,
      params: { page, size, value },
    });

  /**
   * Searches for forest clients by an array of client numbers.
   *
   * @param values - Client numbers to search for.
   * @param page - Page number (default: 0).
   * @param size - Page size (default: 10).
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly searchByClientNumbers = (
    values: string[],
    page: number = 0,
    size: number = 10,
    options?: ResourceRequestOptions,
  ): Promise<ForestClientDto[]> =>
    this.get<ForestClientDto[]>('/searchByNumbers', {
      ...options,
      params: { page, size, values },
    });

  /**
   * Searches the forest clients the authenticated user has access to.
   *
   * @param value - The client name to search for.
   * @param page - Optional page number for pagination.
   * @param size - Page size (default: 10).
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly searchMyForestClients = (
    value: string,
    page?: number,
    size: number = 10,
    options?: ResourceRequestOptions,
  ): Promise<PageableResponse<MyForestClientDto>> =>
    this.get<PageableResponse<MyForestClientDto>>('/clients', {
      ...options,
      params: { page, size, value },
    });
}
