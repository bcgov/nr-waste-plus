/**
 * Unit tests for {@link module:api/resources/species-composition-resource}.
 *
 * @module api/resources/species-composition-resource.unit.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpeciesCompositionResource } from './species-composition-resource';

// setup-env.ts globally mocks this module for component tests; re-register
// it with the real implementation (test-file mocks take precedence) so the
// resource itself is under test.
vi.mock('./species-composition-resource', async (importOriginal) => await importOriginal());

import type { PageableRequest } from '@/api/pagination.types';
import type {
  SpeciesCompositionCreate,
  SpeciesCompositionListItem,
} from '@/api/speciesComposition.types';
import type { RequestContext, ResponseContext } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────

const ok = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/configuration/species-compositions', method: 'GET' },
  ...overrides,
});

const validCreate = {
  startDate: '2026-06-01',
  tableData: { rows: [] },
} as unknown as SpeciesCompositionCreate;

// ── Suite ───────────────────────────────────────────────────────────

describe('SpeciesCompositionResource', () => {
  const transport = vi.fn<(ctx: RequestContext) => Promise<ResponseContext>>();
  let resource: SpeciesCompositionResource;

  beforeEach(() => {
    vi.clearAllMocks();
    resource = new SpeciesCompositionResource(transport);
  });

  const sentCtx = (): RequestContext => transport.mock.calls[0]?.[0] as RequestContext;

  // ── listSpeciesCompositions ──────────────────────────────────────

  it('GETs the collection with cleaned pageable params', async () => {
    transport.mockResolvedValue(ok({ content: [] }));

    await resource.listSpeciesCompositions({
      page: 1,
      size: 25,
      sort: ['startDate,DESC'],
    } as PageableRequest<SpeciesCompositionListItem>);

    expect(sentCtx().config.url).toBe('/api/configuration/species-compositions');
    expect(sentCtx().config.params).toEqual({
      page: 1,
      size: 25,
      sort: ['startDate,DESC'],
    });
  });

  it('forwards signal and meta', async () => {
    transport.mockResolvedValue(ok({ content: [] }));
    const controller = new AbortController();

    await resource.listSpeciesCompositions(
      { page: 0, size: 10 } as PageableRequest<SpeciesCompositionListItem>,
      { signal: controller.signal, meta: { notificationTarget: 'sc-list' } },
    );

    expect(sentCtx().config.signal).toBe(controller.signal);
    expect(sentCtx().meta).toEqual({ notificationTarget: 'sc-list' });
  });

  // ── getSpeciesCompositionById ────────────────────────────────────

  it('GETs the detail by id', async () => {
    transport.mockResolvedValue(ok({ id: 42 }));

    await resource.getSpeciesCompositionById(42);

    expect(sentCtx().config.url).toBe('/api/configuration/species-compositions/42');
  });

  // ── createSpeciesComposition ─────────────────────────────────────

  it('POSTs the payload and parses the ID from the Location header', async () => {
    transport.mockResolvedValue(
      ok(null, {
        status: 201,
        headers: { location: '/api/configuration/species-compositions/555' },
      }),
    );

    const id = await resource.createSpeciesComposition(validCreate);

    expect(id).toBe(555);
    expect(sentCtx().config).toMatchObject({
      url: '/api/configuration/species-compositions',
      method: 'POST',
      data: validCreate,
    });
  });

  it('disables retries for create (maxRetries: 0 reaches the pipeline meta)', async () => {
    transport.mockResolvedValue(ok(null, { status: 201, headers: { location: '/api/x/9' } }));

    await resource.createSpeciesComposition(validCreate);

    expect(sentCtx().meta).toEqual({ maxRetries: 0 });
  });

  it('throws when the create response carries no Location header', async () => {
    transport.mockResolvedValue(ok(null, { status: 201, headers: {} }));

    await expect(resource.createSpeciesComposition(validCreate)).rejects.toThrow(
      'missing a Location header',
    );
  });

  // ── deleteSpeciesComposition ─────────────────────────────────────

  it('DELETEs by id and resolves void', async () => {
    transport.mockResolvedValue(ok(null, { status: 204 }));

    await expect(resource.deleteSpeciesComposition(42)).resolves.toBeUndefined();
    expect(sentCtx().config).toMatchObject({
      url: '/api/configuration/species-compositions/42',
      method: 'DELETE',
    });
  });
});
