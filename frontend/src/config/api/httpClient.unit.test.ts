/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';

import { HttpClient } from './types';

const mockConfig = { BASE: 'http://localhost', VERSION: 'v1' } as any;

const makeClient = (): HttpClient => new HttpClient(mockConfig);

describe('HttpClient.createResource', () => {
  it('passes responseHeader:"location" and resolves the parsed ID', async () => {
    const client = makeClient();
    (client as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/555');

    const result = await client.createResource<number>({
      method: 'POST',
      url: '/api/reporting-units',
      body: { foo: 'bar' },
    });

    expect(result).toBe(555);
    expect((client as any).doRequest).toHaveBeenCalledWith(
      mockConfig,
      expect.objectContaining({
        method: 'POST',
        url: '/api/reporting-units',
        body: { foo: 'bar' },
        responseHeader: 'location',
      }),
    );
  });

  it('uses the default trailing-numeric parser for query-string Location values', async () => {
    const client = makeClient();
    (client as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/777?v=1');

    const result = await client.createResource<number>({
      method: 'POST',
      url: '/api/reporting-units',
    });

    expect(result).toBe(777);
  });

  it('forwards a custom idParser', async () => {
    const client = makeClient();
    (client as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/abc');
    const idParser = vi.fn((location: string): string => location.split('/').pop()!);

    const result = await client.createResource<string>(
      { method: 'POST', url: '/api/reporting-units' },
      idParser,
    );

    expect(idParser).toHaveBeenCalledWith('/reporting-units/abc');
    expect(result).toBe('abc');
  });

  it('rejects with the canonical message when the Location header cannot be parsed', async () => {
    const client = makeClient();
    (client as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/');

    await expect(
      client.createResource<number>({ method: 'POST', url: '/api/reporting-units' }),
    ).rejects.toThrow('Invalid Location header: "/reporting-units/"');
  });

  it('propagates HTTP / network errors unchanged', async () => {
    const client = makeClient();
    const apiError = new Error('400: Validation failed');
    (client as any).doRequest = vi.fn().mockRejectedValue(apiError);

    await expect(
      client.createResource<number>({ method: 'POST', url: '/api/reporting-units' }),
    ).rejects.toThrow('400: Validation failed');
  });

  it('cancels the underlying request when cancelled', async () => {
    const client = makeClient();
    const innerRequest = new Promise<string>(() => {});
    (innerRequest as any).cancel = vi.fn();
    (client as any).doRequest = vi.fn().mockReturnValue(innerRequest);

    const request = client.createResource<number>({
      method: 'POST',
      url: '/api/reporting-units',
    });

    request.cancel();

    await expect(request).rejects.toThrow('Request aborted');
    expect((innerRequest as any).cancel).toHaveBeenCalled();
  });

  it('passes meta through to doRequest', async () => {
    const client = makeClient();
    const meta = { notificationTarget: 'create-ru' };
    (client as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/9');

    await client.createResource<number>({
      method: 'POST',
      url: '/api/reporting-units',
      body: {},
      meta,
    });

    expect((client as any).doRequest).toHaveBeenCalledWith(
      mockConfig,
      expect.objectContaining({ meta }),
    );
  });
});
