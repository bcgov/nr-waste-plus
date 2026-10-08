import { CancelablePromise } from '@/config/api/CancelablePromise';
import { HttpClient, type APIConfig } from '@/config/api/types';

import type { ReportingUnitBlocksRow } from '@/components/waste/ReportingUnits/ReportingUnitBlocksList/constants';
import type { PageableResponse } from '@/types/PageableResponse.types';

import type {
  BlockCreateRequestDto,
  BlockCreateResponseDto,
  BlockDetailsDto,
  ReportingUnitCreateDto,
  ReportingUnitDto,
} from './types';

/**
 * Backend client for Reporting Unit data.
 *
 * Extends {@link HttpClient} to provide typed, schema-validated access to the
 * `/api/reporting-units` backend resource. Validates all responses at runtime
 * using Zod to surface unexpected API shape changes early.
 */
export class ReportingUnitService extends HttpClient {
  /**
   * @param config - API configuration for the reporting-unit backend resource.
   */
  constructor(readonly config: APIConfig) {
    super(config);
  }

  /**
   * Retrieves a reporting unit by ID.
   *
   * Validates the API response against the {@link reportingUnitSchema} at runtime
   * to catch unexpected shape changes from the backend early.
   *
   * @param id - The ID of the reporting unit.
   * @param meta - Optional request metadata used by the API middleware.
   * @returns A promise that resolves to the validated reporting unit details.
   * @throws {Error} When the API response does not match the expected schema.
   * @throws {ApiError} When the HTTP request fails.
   */
  getReportingUnit(
    id: number,
    meta?: Record<string, unknown>,
  ): CancelablePromise<ReportingUnitDto> {
    return this.doRequest<ReportingUnitDto>(this.config, {
      method: 'GET',
      url: `/api/reporting-units/${id}`,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Creates a new reporting unit and returns its numeric ID.
   *
   * The backend returns HTTP 201 (Created) with a `Location` header pointing to
   * `/reporting-units/{id}`. This method extracts the ID from that header and
   * returns it as a number for immediate navigation.
   *
   * @param body - The create request payload.
   * @returns A promise that resolves to the numeric ID of the created reporting unit.
   * @throws {ApiError} When the HTTP request fails (400, 409, 500, etc.).
   */
  createReportingUnit(body: ReportingUnitCreateDto): CancelablePromise<number> {
    return this.createResource({
      method: 'POST',
      url: '/api/reporting-units',
      body,
    });
  }

  /**
   * Retrieves the paged block list for a reporting unit (issue #1250).
   *
   * The backend serves this page from either postgres (blocks created in the
   * new app) or the legacy/Oracle system, whichever owns the reporting unit.
   * Rows match the blocks table shape exactly; fields the backend cannot
   * resolve come back `null` and render as empty-value tags. Following the
   * established paged-list pattern (see `getDistrictVolumes`), the response
   * is typed rather than zod-validated so it stays assignable to the table's
   * `content` prop.
   *
   * @param ruId - The numeric reporting unit whose blocks are listed.
   * @param meta - Optional request metadata used by the API middleware.
   * @returns A promise that resolves to the paged block rows.
   * @throws {ApiError} When the HTTP request fails.
   */
  getBlocks(
    ruId: number,
    meta?: Record<string, unknown>,
  ): CancelablePromise<PageableResponse<ReportingUnitBlocksRow>> {
    return this.doRequest<PageableResponse<ReportingUnitBlocksRow>>(this.config, {
      method: 'GET',
      url: `/api/reporting-units/${ruId}/blocks`,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Retrieves a single block's details (issue #1254).
   *
   * `GET /api/reporting-units/{ruId}/{blockId}` returns the simple block
   * fields typed by {@link BlockDetailsDto}: id, reporting unit, type, draft
   * flag, PLC date, revision, and the `isLegacy` source marker. The response
   * is typed (not zod-parsed) to match the sibling `getBlocks` convention.
   *
   * @param ruId - The numeric reporting unit the block belongs to.
   * @param blockId - The numeric block ID from the route.
   * @param meta - Optional request metadata used by the API middleware.
   * @returns A promise that resolves to the block details.
   * @throws {ApiError} When the HTTP request fails (404 when the feature flag
   *   is off, the reporting unit is unknown, or the block does not exist).
   */
  getBlockDetails(
    ruId: number,
    blockId: number,
    meta?: Record<string, unknown>,
  ): CancelablePromise<BlockDetailsDto> {
    return this.doRequest<BlockDetailsDto>(this.config, {
      method: 'GET',
      url: `/api/reporting-units/${ruId}/${blockId}`,
      ...(meta === undefined ? {} : { meta }),
    });
  }

  /**
   * Creates a new block under the given reporting unit (issue #1228).
   *
   * Contract highlights (issue #1228):
   * - `201` with the full block resource in the body
   *   (`{ id, reportingUnitId, blockType, state, version, createdAt, updatedAt }`).
   * - `409` when a live District Average block already exists for the unit
   *   ("A District Average block already exists for this Reporting Unit").
   * - `404` for an unknown reporting unit (never `403` for RU/block mismatch).
   *
   * STUB: the backend POST endpoint does not exist yet. This method currently
   * fabricates a 201-shaped body after a short delay so the whole UI flow
   * (add → hide panel → refresh list) runs end-to-end. Swap point: delete the
   * stub below and restore the commented-out `doRequest` when the backend
   * lands — nothing else in the app needs to change.
   *
   * @param ruId - The numeric reporting unit the block belongs to.
   * @param body - The block-creation payload (`blockType`).
   * @returns A promise that resolves to the (stubbed) created block resource.
   */
  createBlock(
    ruId: number,
    body: BlockCreateRequestDto,
  ): CancelablePromise<BlockCreateResponseDto> {
    const now = new Date().toISOString();
    const stubBody: BlockCreateResponseDto = {
      id: Date.now(),
      reportingUnitId: ruId,
      blockType: body.blockType,
      state: 'DRAFT',
      version: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new CancelablePromise<BlockCreateResponseDto>((resolve, _reject, onCancel) => {
      const timer = setTimeout(() => resolve(stubBody), 300);
      onCancel(() => clearTimeout(timer));
    });

    // Real implementation — restore once the backend endpoint ships:
    // return this.doRequest<BlockCreateResponseDto>(this.config, {
    //   method: 'POST',
    //   url: `/api/reporting-units/${ruId}/blocks`,
    //   body,
    // });
  }
}
