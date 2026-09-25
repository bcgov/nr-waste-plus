import { removeEmpty } from './utils';

import type {
  FormulaSetRequest,
  FormulaSetResponse,
  FormulaSetListResponse,
  FormulaSetEffectiveParams,
  CurrentFormulaSetParams,
  FormulaVariablesResponse,
  FormulaVariablesParams,
} from './formulaConfiguration.types';
import type { PageableRequest } from '@/services/types';

import { CancelablePromise } from '@/config/api/CancelablePromise';
import { HttpClient, type APIConfig } from '@/config/api/types';

/**
 * Backend client for formula configuration endpoints.
 * Targets the `/api/configuration/formulas` API with date-effective lifecycle.
 */
export class FormulaConfigurationService extends HttpClient {
  /**
   * Creates a formula configuration service.
   *
   * @param config The API client configuration.
   */
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Retrieves a paginated list of formula sets.
   *
   * @param pageable Pagination and sorting options.
   * @param meta Optional request metadata.
   * @returns A paged list of formula set items.
   */
  getFormulaSets(
    pageable: PageableRequest<FormulaSetResponse>,
    meta?: Record<string, unknown>,
  ): CancelablePromise<FormulaSetListResponse> {
    return this.doRequest<FormulaSetListResponse>(this.config, {
      method: 'GET',
      url: '/api/configuration/formulas',
      query: removeEmpty(pageable),
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Retrieves the formula set effective for the given date and area.
   *
   * @param params Date and area parameters for effective lookup.
   * @param meta Optional request metadata.
   * @returns The formula set effective for that date/area context.
   * @throws 400 if date format or area is invalid.
   * @throws 404 if no formula set is effective for the given date/area.
   */
  getEffectiveFormulaSet(
    params: FormulaSetEffectiveParams,
    meta?: Record<string, unknown>,
  ): CancelablePromise<FormulaSetResponse> {
    return this.doRequest<FormulaSetResponse>(this.config, {
      method: 'GET',
      url: `/api/configuration/formulas/${params.date}/${params.area}`,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Retrieves a single formula set by ID.
   *
   * @param id The formula set ID.
   * @param meta Optional request metadata.
   * @returns The formula set.
   * @throws 404 if formula set not found.
   */
  getFormulaSet(id: number, meta?: Record<string, unknown>): CancelablePromise<FormulaSetResponse> {
    return this.doRequest<FormulaSetResponse>(this.config, {
      method: 'GET',
      url: `/api/configuration/formulas/${id}`,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /** Retrieves the current open-ended formula set for carry-forward. */
  getCurrentOpenEndedFormulaSet(
    params: CurrentFormulaSetParams,
    meta?: Record<string, unknown>,
  ): CancelablePromise<FormulaSetResponse> {
    return this.doRequest<FormulaSetResponse>(this.config, {
      method: 'GET',
      url: `/api/configuration/formulas/current/${params.area}`,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Creates a new formula set.
   *
   * @param dto The formula set creation payload.
   * @param meta Optional request metadata.
   * @returns The created formula set with assigned ID.
   * @throws 422 if any formula fails validation.
   */
  createFormulaSet(
    dto: FormulaSetRequest,
    meta?: Record<string, unknown>,
  ): CancelablePromise<FormulaSetResponse> {
    return this.doRequest<FormulaSetResponse>(this.config, {
      method: 'POST',
      url: '/api/configuration/formulas',
      body: dto,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Updates a formula set with a complete replacement.
   * This is an idempotent PUT operation - the entire formula set is replaced.
   *
   * @param id The formula set ID.
   * @param dto The complete formula set update payload.
   * @param meta Optional request metadata.
   * @returns The updated formula set.
   * @throws 404 if formula set not found.
   * @throws 422 if any formula fails validation or update conflicts with lifecycle rules.
   * @throws 409 if a future open-ended set already exists for the area.
   */
  updateFormulaSet(
    id: number,
    dto: FormulaSetRequest,
    meta?: Record<string, unknown>,
  ): CancelablePromise<FormulaSetResponse> {
    return this.doRequest<FormulaSetResponse>(this.config, {
      method: 'PUT',
      url: `/api/configuration/formulas/${id}`,
      body: dto,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Soft-deletes a future open-ended formula set.
   * Only entries whose start date is strictly after the current business date
   * and have no end date (open-ended) can be deleted.
   * Deleting a future entry reopens its predecessor by clearing the predecessor's end date.
   *
   * @param id The formula set ID.
   * @param meta Optional request metadata.
   * @returns A promise that resolves when the delete completes (204 No Content).
   * @throws 404 if formula set not found.
   * @throws 422 if the formula set is not a future open-ended set.
   */
  deleteFormulaSet(id: number, meta?: Record<string, unknown>): CancelablePromise<void> {
    return this.doRequest<void>(this.config, {
      method: 'DELETE',
      url: `/api/configuration/formulas/${id}`,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Returns available formula variables with nested, flat, and schema representations.
   *
   * @param params Date, area, and district parameters for variable resolution.
   * @param meta Optional request metadata.
   * @returns Three complementary variable representations.
   */
  getVariables(
    params: FormulaVariablesParams,
    meta?: Record<string, unknown>,
  ): CancelablePromise<FormulaVariablesResponse> {
    return this.doRequest<FormulaVariablesResponse>(this.config, {
      method: 'GET',
      url: '/api/configuration/formulas/variables',
      query: { date: params.date, area: params.area, districtCode: params.districtCode },
      ...(meta === undefined ? {} : { meta }),
    });
  }
}
