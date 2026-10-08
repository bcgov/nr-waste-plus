/**
 * Unit tests for {@link module:api/resources/codes-resource}.
 *
 * Resources are exercised against an injected fake transport — no HTTP,
 * no axios, no pipeline.
 *
 * @module api/resources/codes-resource.unit.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// setup-env.ts globally mocks this module for component tests; re-register it
// with the real implementation (test-file mocks take precedence) so the
// resource itself is under test.
vi.mock('./codes-resource', async (importOriginal) => await importOriginal());

import { CodesResource } from './codes-resource';

import type { RequestContext, ResponseContext } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────

const ok = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/codes', method: 'GET' },
  ...overrides,
});

// ── Suite ───────────────────────────────────────────────────────────

describe('CodesResource', () => {
  const transport = vi.fn<(ctx: RequestContext) => Promise<ResponseContext>>();
  let resource: CodesResource;

  beforeEach(() => {
    vi.clearAllMocks();
    resource = new CodesResource(transport);
  });

  const sentCtx = (): RequestContext => transport.mock.calls[0]?.[0] as RequestContext;

  const samplingOptions = [{ code: 'S1', description: 'Sampling 1' }];

  it('GETs /api/codes/samplings and resolves the body', async () => {
    transport.mockResolvedValue(ok(samplingOptions));

    const result = await resource.getSamplingOptions();

    expect(result).toEqual(samplingOptions);
    expect(sentCtx().config).toMatchObject({
      url: '/api/codes/samplings',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('GETs /api/codes/districts', async () => {
    transport.mockResolvedValue(ok([]));

    await resource.getDistricts();

    expect(sentCtx().config.url).toBe('/api/codes/districts');
  });

  it('GETs /api/codes/assess-area-statuses', async () => {
    transport.mockResolvedValue(ok([]));

    await resource.getAssessAreaStatuses();

    expect(sentCtx().config.url).toBe('/api/codes/assess-area-statuses');
  });

  it('passes signal through to the request context', async () => {
    transport.mockResolvedValue(ok([]));
    const controller = new AbortController();

    await resource.getDistricts({ signal: controller.signal });

    expect(sentCtx().config.signal).toBe(controller.signal);
  });

  it('seeds ctx.meta from options.meta (notificationTarget routing)', async () => {
    transport.mockResolvedValue(ok([]));

    await resource.getSamplingOptions({ meta: { notificationTarget: 'waste-search' } });

    expect(sentCtx().meta).toEqual({ notificationTarget: 'waste-search' });
  });

  it('propagates pipeline errors', async () => {
    transport.mockRejectedValue(new Error('pipeline failure'));

    await expect(resource.getDistricts()).rejects.toThrow('pipeline failure');
  });
});
