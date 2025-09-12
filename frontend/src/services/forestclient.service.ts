import { HttpClient, type APIConfig } from '@/config/api/types';

import type {
  CodeDescriptionDto,
  ForestClientAutocompleteResultDto,
  ForestClientDto,
} from './types';
import type { CancelablePromise } from '@/config/api/CancelablePromise';

export class ForestClientService extends HttpClient {
  constructor(readonly config: APIConfig) {
    super(config);
  }

  getForestClient(clientNumber: string): CancelablePromise<ForestClientDto> {
    return this.doRequest(this.config, {
      method: 'GET',
      url: '/api/forest-clients/{clientNumber}',
      path: {
        clientNumber: clientNumber,
      },
    });
  }

  getForestClientLocations(clientNumber: string): CancelablePromise<Array<CodeDescriptionDto>> {
    return this.doRequest(this.config, {
      method: 'GET',
      url: '/api/forest-clients/{clientNumber}/locations',
      path: {
        clientNumber: clientNumber,
      },
    });
  }

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
}
