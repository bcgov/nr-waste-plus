/**
 * Unit tests for {@link module:api/resources/formula-configuration-resource}.
 *
 * @module api/resources/formula-configuration-resource.unit.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormulaConfigurationResource } from './formula-configuration-resource';

// setup-env.ts globally mocks this module for component tests; re-register
// it with the real implementation (test-file mocks take precedence) so the
// resource itself is under test.
vi.mock('./formula-configuration-resource', async (importOriginal) => await importOriginal());

import type { FormulaSetRequest, FormulaSetResponse } from '@/api/formulaConfiguration.types';
import type { PageableRequest } from '@/api/pagination.types';
import type { RequestContext, ResponseContext } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────

const ok = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/configuration/formulas', method: 'GET' },
  ...overrides,
});

const validRequest = { area: 'INTERIOR', startDate: '2026-06-01' } as unknown as FormulaSetRequest;

// ── Suite ───────────────────────────────────────────────────────────

describe('FormulaConfigurationResource', () => {
  const transport = vi.fn<(ctx: RequestContext) => Promise<ResponseContext>>();
  let resource: FormulaConfigurationResource;

  beforeEach(() => {
    vi.clearAllMocks();
    resource = new FormulaConfigurationResource(transport);
  });

  const sentCtx = (): RequestContext => transport.mock.calls[0]?.[0] as RequestContext;

  // ── getFormulaSets ───────────────────────────────────────────────

  it('GETs the collection with cleaned pageable params', async () => {
    transport.mockResolvedValue(ok({ content: [] }));

    await resource.getFormulaSets({
      page: 1,
      size: 25,
      sort: ['startDate,DESC'],
    } as PageableRequest<FormulaSetResponse>);

    expect(sentCtx().config.url).toBe('/api/configuration/formulas');
    expect(sentCtx().config.params).toEqual({ page: 1, size: 25, sort: ['startDate,DESC'] });
  });

  it('forwards signal and meta', async () => {
    transport.mockResolvedValue(ok({ content: [] }));
    const controller = new AbortController();

    await resource.getFormulaSets({ page: 0, size: 10 } as PageableRequest<FormulaSetResponse>, {
      signal: controller.signal,
      meta: { notificationTarget: 'formula-list' },
    });

    expect(sentCtx().config.signal).toBe(controller.signal);
    expect(sentCtx().meta).toEqual({ notificationTarget: 'formula-list' });
  });

  // ── getEffectiveFormulaSet ───────────────────────────────────────

  it('builds the effective URL from date and area segments', async () => {
    transport.mockResolvedValue(ok({ id: 1 }));

    await resource.getEffectiveFormulaSet({ date: '2026-06-01', area: 'INTERIOR' });

    expect(sentCtx().config.url).toBe('/api/configuration/formulas/2026-06-01/INTERIOR');
  });

  // ── getFormulaSet ────────────────────────────────────────────────

  it('GETs a formula set by id', async () => {
    transport.mockResolvedValue(ok({ id: 42 }));

    await resource.getFormulaSet(42);

    expect(sentCtx().config.url).toBe('/api/configuration/formulas/42');
  });

  // ── getCurrentOpenEndedFormulaSet ────────────────────────────────

  it('builds the current open-ended URL from the area', async () => {
    transport.mockResolvedValue(ok({ id: 5 }));

    await resource.getCurrentOpenEndedFormulaSet({ area: 'COASTAL' });

    expect(sentCtx().config.url).toBe('/api/configuration/formulas/current/COASTAL');
  });

  // ── createFormulaSet ─────────────────────────────────────────────

  it('POSTs the payload and returns the created record', async () => {
    transport.mockResolvedValue(ok({ id: 7 }));

    const result = await resource.createFormulaSet(validRequest);

    expect(result).toEqual({ id: 7 });
    expect(sentCtx().config).toMatchObject({
      url: '/api/configuration/formulas',
      method: 'POST',
      data: validRequest,
    });
  });

  it('disables retries for create (maxRetries: 0 reaches the pipeline meta)', async () => {
    transport.mockResolvedValue(ok({ id: 7 }));

    await resource.createFormulaSet(validRequest);

    expect(sentCtx().meta).toEqual({ maxRetries: 0 });
  });

  it('merges caller meta on top of the create defaults', async () => {
    transport.mockResolvedValue(ok({ id: 7 }));

    await resource.createFormulaSet(validRequest, { meta: { notificationTarget: 'formula-form' } });

    expect(sentCtx().meta).toEqual({
      maxRetries: 0,
      notificationTarget: 'formula-form',
    });
  });

  // ── updateFormulaSet ─────────────────────────────────────────────

  it('PUTs the full replacement payload and returns the updated record', async () => {
    transport.mockResolvedValue(ok({ id: 5 }));

    const result = await resource.updateFormulaSet(5, validRequest);

    expect(result).toEqual({ id: 5 });
    expect(sentCtx().config).toMatchObject({
      url: '/api/configuration/formulas/5',
      method: 'PUT',
      data: validRequest,
    });
  });

  // ── deleteFormulaSet ─────────────────────────────────────────────

  it('DELETEs by id and resolves void', async () => {
    transport.mockResolvedValue(ok(null, { status: 204 }));

    await expect(resource.deleteFormulaSet(5)).resolves.toBeUndefined();
    expect(sentCtx().config).toMatchObject({
      url: '/api/configuration/formulas/5',
      method: 'DELETE',
    });
  });

  // ── getVariables ─────────────────────────────────────────────────

  it('GETs variables with date, area, and districtCode params', async () => {
    transport.mockResolvedValue(ok({ nested: {}, flat: {}, schema: {} }));

    await resource.getVariables({ date: '2026-06-01', area: 'INTERIOR', districtCode: 'DKM' });

    expect(sentCtx().config).toMatchObject({
      url: '/api/configuration/formulas/variables',
      params: { date: '2026-06-01', area: 'INTERIOR', districtCode: 'DKM' },
    });
  });
});
