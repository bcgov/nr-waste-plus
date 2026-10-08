/**
 * Unit tests for {@link module:api/resources/reporting-unit-resource}.
 *
 * @module api/resources/reporting-unit-resource.unit.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportingUnitResource } from './reporting-unit-resource';

// setup-env.ts globally mocks this module for component tests; re-register
// it with the real implementation (test-file mocks take precedence) so the
// resource itself is under test.
vi.mock('./reporting-unit-resource', async (importOriginal) => await importOriginal());

import type { RequestContext, ResponseContext } from '@/http/types';
import type { ReportingUnitCreateDto } from '@/api/types';

// ── Helpers ─────────────────────────────────────────────────────────

const ok = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/reporting-units', method: 'GET' },
  ...overrides,
});

const validCreate = {
  clientNumber: '00012797',
  districtCode: 'DKM',
  samplingCode: 'AVG',
  gradeCode: null,
} as ReportingUnitCreateDto;

// ── Suite ───────────────────────────────────────────────────────────

describe('ReportingUnitResource', () => {
  const transport = vi.fn<(ctx: RequestContext) => Promise<ResponseContext>>();
  let resource: ReportingUnitResource;

  beforeEach(() => {
    vi.clearAllMocks();
    resource = new ReportingUnitResource(transport);
  });

  const sentCtx = (): RequestContext => transport.mock.calls[0]?.[0] as RequestContext;

  // ── getReportingUnit ─────────────────────────────────────────────

  it('GETs a reporting unit by id', async () => {
    transport.mockResolvedValue(ok({ id: 42, ruNumber: 4069 }));

    const result = await resource.getReportingUnit(42);

    expect(result).toEqual({ id: 42, ruNumber: 4069 });
    expect(sentCtx().config).toMatchObject({
      url: '/api/reporting-units/42',
      method: 'GET',
    });
  });

  it('passes signal and notificationTarget meta through', async () => {
    transport.mockResolvedValue(ok({ id: 42 }));
    const controller = new AbortController();

    await resource.getReportingUnit(42, {
      signal: controller.signal,
      meta: { notificationTarget: 'ru-details' },
    });

    expect(sentCtx().config.signal).toBe(controller.signal);
    expect(sentCtx().meta).toEqual({ notificationTarget: 'ru-details' });
  });

  // ── createReportingUnit ──────────────────────────────────────────

  it('POSTs the create payload and parses the ID from the Location header', async () => {
    transport.mockResolvedValue(
      ok(null, { status: 201, headers: { location: '/api/reporting-units/42' } }),
    );

    const id = await resource.createReportingUnit(validCreate);

    expect(id).toBe(42);
    expect(sentCtx().config).toMatchObject({
      url: '/api/reporting-units',
      method: 'POST',
      data: validCreate,
    });
  });

  it('disables retries for create (maxRetries: 0 reaches the pipeline meta)', async () => {
    transport.mockResolvedValue(
      ok(null, { status: 201, headers: { location: '/api/reporting-units/7' } }),
    );

    await resource.createReportingUnit(validCreate);

    expect(sentCtx().meta).toEqual({ maxRetries: 0 });
  });

  it('merges caller meta on top of the create defaults', async () => {
    transport.mockResolvedValue(
      ok(null, { status: 201, headers: { location: '/api/reporting-units/7' } }),
    );

    await resource.createReportingUnit(validCreate, {
      meta: { notificationTarget: 'create-ru-form' },
    });

    expect(sentCtx().meta).toEqual({
      maxRetries: 0,
      notificationTarget: 'create-ru-form',
    });
  });

  it('throws when the create response carries no Location header', async () => {
    transport.mockResolvedValue(ok(null, { status: 201, headers: {} }));

    await expect(resource.createReportingUnit(validCreate)).rejects.toThrow(
      'missing a Location header',
    );
  });

  it('throws when the Location header has no numeric segment', async () => {
    transport.mockResolvedValue(
      ok(null, { status: 201, headers: { location: '/api/reporting-units/' } }),
    );

    await expect(resource.createReportingUnit(validCreate)).rejects.toThrow(
      'Invalid Location header',
    );
  });

  it('propagates pipeline errors', async () => {
    transport.mockRejectedValue(new Error('conflict'));

    await expect(resource.createReportingUnit(validCreate)).rejects.toThrow('conflict');
  });
});
