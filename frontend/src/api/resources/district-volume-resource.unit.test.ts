/**
 * Unit tests for {@link module:api/resources/district-volume-resource}.
 *
 * @module api/resources/district-volume-resource.unit.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DistrictVolumeResource } from './district-volume-resource';

// setup-env.ts globally mocks this module for component tests; re-register
// it with the real implementation (test-file mocks take precedence) so the
// resource itself is under test.
vi.mock('./district-volume-resource', async (importOriginal) => await importOriginal());

import type { DistrictVolumeCreate, DistrictVolumeListItem } from '@/api/districtvolumes.types';
import type { PageableRequest } from '@/api/pagination.types';
import type { RequestContext, ResponseContext } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────

const ok = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/configuration/district-average-volumes', method: 'GET' },
  ...overrides,
});

const validCreate = {
  area: 'INTERIOR',
  startDate: '2026-06-01',
  tableLevelFactor: 1.5,
  tableData: { type: 'INTERIOR', zones: [], formulas: {} },
} as unknown as DistrictVolumeCreate;

// ── Suite ───────────────────────────────────────────────────────────

describe('DistrictVolumeResource', () => {
  const transport = vi.fn<(ctx: RequestContext) => Promise<ResponseContext>>();
  let resource: DistrictVolumeResource;

  beforeEach(() => {
    vi.clearAllMocks();
    resource = new DistrictVolumeResource(transport);
  });

  const sentCtx = (): RequestContext => transport.mock.calls[0]?.[0] as RequestContext;

  // ── getDistrictVolumes ───────────────────────────────────────────

  it('GETs the collection with cleaned pageable params', async () => {
    transport.mockResolvedValue(ok({ content: [] }));

    await resource.getDistrictVolumes(undefined, {
      page: 1,
      size: 25,
      sort: ['area,ASC'],
    } as PageableRequest<DistrictVolumeListItem>);

    expect(sentCtx().config.url).toBe('/api/configuration/district-average-volumes');
    // removeEmpty strips falsy scalars — page:1 is kept (truthy)
    expect(sentCtx().config.params).toEqual({ page: 1, size: 25, sort: ['area,ASC'] });
  });

  it('adds the area filter when provided', async () => {
    transport.mockResolvedValue(ok({ content: [] }));

    await resource.getDistrictVolumes('INTERIOR', {
      page: 0,
      size: 10,
    } as PageableRequest<DistrictVolumeListItem>);

    expect(sentCtx().config.params).toEqual({ size: 10, area: 'INTERIOR' });
  });

  it('forwards signal and meta', async () => {
    transport.mockResolvedValue(ok({ content: [] }));
    const controller = new AbortController();

    await resource.getDistrictVolumes(
      undefined,
      { page: 0, size: 10 } as PageableRequest<DistrictVolumeListItem>,
      { signal: controller.signal, meta: { notificationTarget: 'dv-list' } },
    );

    expect(sentCtx().config.signal).toBe(controller.signal);
    expect(sentCtx().meta).toEqual({ notificationTarget: 'dv-list' });
  });

  // ── createDistrictVolumeTable ────────────────────────────────────

  it('POSTs the payload and parses the ID from the Location header', async () => {
    transport.mockResolvedValue(
      ok(null, {
        status: 201,
        headers: { location: '/api/configuration/district-average-volumes/444' },
      }),
    );

    const id = await resource.createDistrictVolumeTable(validCreate);

    expect(id).toBe(444);
    expect(sentCtx().config).toMatchObject({
      url: '/api/configuration/district-average-volumes',
      method: 'POST',
      data: validCreate,
    });
  });

  it('disables retries for create (maxRetries: 0 reaches the pipeline meta)', async () => {
    transport.mockResolvedValue(ok(null, { status: 201, headers: { location: '/api/x/7' } }));

    await resource.createDistrictVolumeTable(validCreate);

    expect(sentCtx().meta).toEqual({ maxRetries: 0 });
  });

  it('throws when the create response carries no Location header', async () => {
    transport.mockResolvedValue(ok(null, { status: 201, headers: {} }));

    await expect(resource.createDistrictVolumeTable(validCreate)).rejects.toThrow(
      'missing a Location header',
    );
  });

  // ── getDistrictVolumeTableDetail ─────────────────────────────────

  it('GETs the detail by id', async () => {
    transport.mockResolvedValue(ok({ id: 42 }));

    await resource.getDistrictVolumeTableDetail(42);

    expect(sentCtx().config.url).toBe('/api/configuration/district-average-volumes/42');
  });

  // ── deleteDistrictVolume ─────────────────────────────────────────

  it('DELETEs by id and resolves void', async () => {
    transport.mockResolvedValue(ok(null, { status: 204 }));

    await expect(resource.deleteDistrictVolume(42)).resolves.toBeUndefined();
    expect(sentCtx().config).toMatchObject({
      url: '/api/configuration/district-average-volumes/42',
      method: 'DELETE',
    });
  });
});
