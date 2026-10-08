/**
 * Unit tests for {@link module:api/resources/users-resource}.
 *
 * @module api/resources/users-resource.unit.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsersResource } from './users-resource';

// setup-env.ts globally mocks this module for component tests; re-register
// it with the real implementation (test-file mocks take precedence) so the
// resource itself is under test.
vi.mock('./users-resource', async (importOriginal) => await importOriginal());

import type { RequestContext, ResponseContext } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────

const ok = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/users', method: 'GET' },
  ...overrides,
});

// ── Suite ───────────────────────────────────────────────────────────

describe('UsersResource', () => {
  const transport = vi.fn<(ctx: RequestContext) => Promise<ResponseContext>>();
  let resource: UsersResource;

  beforeEach(() => {
    vi.clearAllMocks();
    resource = new UsersResource(transport);
  });

  const sentCtx = (): RequestContext => transport.mock.calls[0]?.[0] as RequestContext;

  it('GETs /api/users/preferences', async () => {
    transport.mockResolvedValue(ok({ theme: 'g10' }));

    const result = await resource.getUserPreferences();

    expect(result).toEqual({ theme: 'g10' });
    expect(sentCtx().config).toMatchObject({ url: '/api/users/preferences', method: 'GET' });
  });

  it('PUTs preferences with the payload as request data', async () => {
    transport.mockResolvedValue(ok(null, { status: 204 }));

    await resource.updateUserPreferences({ theme: 'g90' });

    expect(sentCtx().config).toMatchObject({
      url: '/api/users/preferences',
      method: 'PUT',
      data: { theme: 'g90' },
    });
  });

  it('PUTs a bookmark for the reporting unit', async () => {
    transport.mockResolvedValue(ok(null, { status: 204 }));

    await resource.setUserBookmarkedRu(4069);

    expect(sentCtx().config).toMatchObject({
      url: '/api/users/bookmarks/4069',
      method: 'PUT',
    });
  });

  it('DELETEs a bookmark for the reporting unit', async () => {
    transport.mockResolvedValue(ok(null, { status: 204 }));

    await resource.deleteUserBookmarkedRu(4069);

    expect(sentCtx().config).toMatchObject({
      url: '/api/users/bookmarks/4069',
      method: 'DELETE',
    });
  });

  it('URL-encodes dynamic bookmark segments', async () => {
    transport.mockResolvedValue(ok(null, { status: 204 }));

    await resource.setUserBookmarkedRu(Number.NaN as unknown as number);

    expect(sentCtx().config.url).toBe('/api/users/bookmarks/NaN');
  });

  it('passes signal and meta through', async () => {
    transport.mockResolvedValue(ok({}));
    const controller = new AbortController();

    await resource.getUserPreferences({
      signal: controller.signal,
      meta: { suppressFailureNotification: true },
    });

    expect(sentCtx().config.signal).toBe(controller.signal);
    expect(sentCtx().meta).toEqual({ suppressFailureNotification: true });
  });

  it('resolves void for 204 bookmark responses', async () => {
    transport.mockResolvedValue(ok(null, { status: 204 }));

    await expect(resource.setUserBookmarkedRu(1)).resolves.toBeUndefined();
  });

  it('propagates pipeline errors', async () => {
    transport.mockRejectedValue(new Error('pipeline failure'));

    await expect(resource.getUserPreferences()).rejects.toThrow('pipeline failure');
  });
});
