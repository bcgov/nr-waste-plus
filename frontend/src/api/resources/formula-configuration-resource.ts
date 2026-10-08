/**
 * FormulaConfigurationResource — typed API resource for
 * `/api/configuration/formulas`.
 *
 * Date-effective formula-set lifecycle endpoints. Framework-agnostic:
 * TanStack Query hooks live in `api/formulaConfiguration.ts`. All
 * requests flow through the middleware pipeline.
 *
 * @module api/resources/formula-configuration-resource
 */

import { removeEmpty } from '@/api/utils';
import { Resource } from '@/http/resource';

import type {
  CurrentFormulaSetParams,
  FormulaSetEffectiveParams,
  FormulaSetListResponse,
  FormulaSetRequest,
  FormulaSetResponse,
  FormulaVariablesParams,
  FormulaVariablesResponse,
} from '@/api/formulaConfiguration.types';
import type { PageableRequest } from '@/api/pagination.types';
import type { ResourceRequestOptions } from '@/http/resource';
import type { Transport } from '@/http/types';

/**
 * API resource for formula configuration endpoints.
 *
 * @param transport - Configured pipeline from `createApiClient()`.
 */
export class FormulaConfigurationResource extends Resource<FormulaSetResponse> {
  constructor(transport: Transport) {
    super('/api/configuration/formulas', transport);
  }

  /**
   * Retrieves a paginated list of formula sets.
   *
   * @param pageable - Pagination and sorting options.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getFormulaSets = (
    pageable: PageableRequest<FormulaSetResponse>,
    options?: ResourceRequestOptions,
  ): Promise<FormulaSetListResponse> =>
    this.get<FormulaSetListResponse>('', {
      ...options,
      params: removeEmpty(pageable),
    });

  /**
   * Retrieves the formula set effective for the given date and area.
   *
   * @param params - Date and area parameters for the effective lookup.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getEffectiveFormulaSet = (
    params: FormulaSetEffectiveParams,
    options?: ResourceRequestOptions,
  ): Promise<FormulaSetResponse> =>
    this.get<FormulaSetResponse>(
      `/${encodeURIComponent(params.date)}/${encodeURIComponent(params.area)}`,
      options,
    );

  /**
   * Retrieves a single formula set by ID.
   *
   * @param id - The formula set ID.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getFormulaSet = (
    id: number,
    options?: ResourceRequestOptions,
  ): Promise<FormulaSetResponse> =>
    this.get<FormulaSetResponse>(`/${encodeURIComponent(String(id))}`, options);

  /**
   * Retrieves the current open-ended formula set for carry-forward.
   *
   * @param params - Area parameter for the current lookup.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getCurrentOpenEndedFormulaSet = (
    params: CurrentFormulaSetParams,
    options?: ResourceRequestOptions,
  ): Promise<FormulaSetResponse> =>
    this.get<FormulaSetResponse>(`/current/${encodeURIComponent(params.area)}`, options);

  /**
   * Creates a new formula set and returns the created record.
   *
   * Retries are disabled (`meta.maxRetries: 0` by default): a POST
   * replayed after an ambiguous network failure could duplicate the
   * record.
   *
   * @param dto - The formula set creation payload.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly createFormulaSet = (
    dto: FormulaSetRequest,
    options?: ResourceRequestOptions,
  ): Promise<FormulaSetResponse> =>
    this.post<FormulaSetResponse>('', dto, {
      ...options,
      meta: { maxRetries: 0, ...options?.meta },
    });

  /**
   * Updates a formula set with a complete replacement (idempotent PUT).
   *
   * @param id - The formula set ID.
   * @param dto - The complete formula set update payload.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly updateFormulaSet = async (
    id: number,
    dto: FormulaSetRequest,
    options?: ResourceRequestOptions,
  ): Promise<FormulaSetResponse> => {
    const res = await this.request<FormulaSetResponse>(
      'PUT',
      `/${encodeURIComponent(String(id))}`,
      { ...options, data: dto },
    );
    return res.data;
  };

  /**
   * Soft-deletes a future open-ended formula set.
   *
   * Only entries whose start date is strictly after the current business
   * date and have no end date (open-ended) can be deleted. Deleting a
   * future entry reopens its predecessor by clearing its end date.
   *
   * @param id - The formula set ID.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly deleteFormulaSet = async (
    id: number,
    options?: ResourceRequestOptions,
  ): Promise<void> => {
    await this.request('DELETE', `/${encodeURIComponent(String(id))}`, options);
  };

  /**
   * Returns available formula variables with nested, flat, and schema
   * representations.
   *
   * @param params - Date, area, and district parameters.
   * @param options - Request options (AbortSignal, pipeline meta).
   */
  readonly getVariables = (
    params: FormulaVariablesParams,
    options?: ResourceRequestOptions,
  ): Promise<FormulaVariablesResponse> =>
    this.get<FormulaVariablesResponse>('/variables', {
      ...options,
      params: { date: params.date, area: params.area, districtCode: params.districtCode },
    });
}
