/**
 * Unit tests for {@link module:api/resources/forest-client-resource}.
 *
 * @module api/resources/forest-client-resource.unit.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// setup-env.ts globally mocks this module for component tests; re-register it
// with the real implementation (test-file mocks take precedence) so the
// resource itself is under test.
vi.mock('./forest-client-resource', async (importOriginal) => await importOriginal());

import { ForestClientResource } from './forest-client-resource';

import type { RequestContext, ResponseContext } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────

const ok = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/forest-clients', method: 'GET' },
  ...overrides,
});

// ── Suite ───────────────────────────────────────────────────────────

describe('ForestClientResource', () => {
  const transport = vi.fn<(ctx: RequestContext) => Promise<ResponseContext>>();
  let resource: ForestClientResource;

  beforeEach(() => {
    vi.clearAllMocks();
    resource = new ForestClientResource(transport);
  });

  const sentCtx = (): RequestContext => transport.mock.calls[0]?.[0] as RequestContext;

  // ── getForestClient ──────────────────────────────────────────────

  it('GETs a client by number with the segment URL-encoded', async () => {
    transport.mockResolvedValue(ok({ id: '00012797' }));

    await resource.getForestClient('00012797');

    expect(sentCtx().config.url).toBe('/api/forest-clients/00012797');
  });

  it('encodes special characters in the client number segment', async () => {
    transport.mockResolvedValue(ok({}));

    await resource.getForestClient('a/b c');

    expect(sentCtx().config.url).toBe('/api/forest-clients/a%2Fb%20c');
  });

  // ── searchForestClients ──────────────────────────────────────────

  it('searches by name/acronym/number with page, size, and value params', async () => {
    transport.mockResolvedValue(ok([]));

    await resource.searchForestClients('acme', 2, 25);

    expect(sentCtx().config).toMatchObject({
      url: '/api/forest-clients/byNameAcronymNumber',
      params: { page: 2, size: 25, value: 'acme' },
    });
  });

  it('defaults size to 10 and leaves page undefined when omitted', async () => {
    transport.mockResolvedValue(ok([]));

    await resource.searchForestClients('acme');

    expect(sentCtx().config.params).toEqual({ page: undefined, size: 10, value: 'acme' });
  });

  // ── searchByClientNumbers ────────────────────────────────────────

  it('searches by client numbers with array values param', async () => {
    transport.mockResolvedValue(ok([]));

    await resource.searchByClientNumbers(['00012797', '00012798'], 0, 2);

    expect(sentCtx().config).toMatchObject({
      url: '/api/forest-clients/searchByNumbers',
      params: { page: 0, size: 2, values: ['00012797', '00012798'] },
    });
  });

  it('defaults page to 0 and size to 10', async () => {
    transport.mockResolvedValue(ok([]));

    await resource.searchByClientNumbers(['00012797']);

    expect(sentCtx().config.params).toEqual({
      page: 0,
      size: 10,
      values: ['00012797'],
    });
  });

  // ── searchMyForestClients ────────────────────────────────────────

  it('searches the user-accessible clients and forwards meta', async () => {
    transport.mockResolvedValue(ok({ content: [], page: { number: 0, size: 10 } }));
    const controller = new AbortController();

    await resource.searchMyForestClients('oak', 1, 20, {
      signal: controller.signal,
      meta: { notificationTarget: 'my-clients' },
    });

    expect(sentCtx().config).toMatchObject({
      url: '/api/forest-clients/clients',
      params: { page: 1, size: 20, value: 'oak' },
      signal: controller.signal,
    });
    expect(sentCtx().meta).toEqual({ notificationTarget: 'my-clients' });
  });
});
