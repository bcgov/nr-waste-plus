import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureRuntimeConfig, hasRequiredRuntimeConfig } from '@/runtimeConfigLoader';

describe('runtimeConfigLoader', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APP_NAME', '');
    vi.stubEnv('VITE_BACKEND_URL', '');
    globalThis.window.config = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.window.config = undefined;
    document.head.innerHTML = '';
  });

  it('returns true immediately when required config is already on window.config', async () => {
    globalThis.window.config = {
      VITE_APP_NAME: 'Waste Plus',
      VITE_BACKEND_URL: 'https://api.example.test',
    };
    const loadScript = vi.fn<(_src: string) => Promise<void>>();

    expect(hasRequiredRuntimeConfig()).toBe(true);
    await expect(ensureRuntimeConfig({ loadScript, retryDelaysMs: [10] })).resolves.toBe(true);
    expect(loadScript).not.toHaveBeenCalled();
  });

  it('returns true immediately when required config is already in build env', async () => {
    vi.stubEnv('VITE_APP_NAME', 'Waste Plus');
    vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:8080');
    const loadScript = vi.fn<(_src: string) => Promise<void>>();

    expect(hasRequiredRuntimeConfig()).toBe(true);
    await expect(ensureRuntimeConfig({ loadScript, retryDelaysMs: [10] })).resolves.toBe(true);
    expect(loadScript).not.toHaveBeenCalled();
  });

  it('retries config.js after a failure and then reloads params.js', async () => {
    const requestedScripts: string[] = [];
    const loadScript = vi.fn(async (src: string): Promise<void> => {
      requestedScripts.push(src);
      if (src.startsWith('/data/config.js?retry=1')) {
        throw new Error('transient failure');
      }
      if (src.startsWith('/data/config.js?retry=2')) {
        globalThis.window.config = {
          VITE_APP_NAME: 'Waste Plus',
          VITE_BACKEND_URL: 'https://api.example.test',
        };
        return;
      }
      if (src.startsWith('/data/params.js?retry=2')) {
        globalThis.window.config = {
          ...(globalThis.window.config as Record<string, unknown>),
          VITE_FEATURE_FLAGS: { 'offline-mode-enabled': true },
        };
      }
    });

    await expect(ensureRuntimeConfig({ loadScript, retryDelaysMs: [0, 0, 0] })).resolves.toBe(true);

    expect(requestedScripts).toHaveLength(3);
    expect(requestedScripts[0]).toMatch(/^\/data\/config\.js\?retry=1&t=\d+$/);
    expect(requestedScripts[1]).toMatch(/^\/data\/config\.js\?retry=2&t=\d+$/);
    expect(requestedScripts[2]).toMatch(/^\/data\/params\.js\?retry=2&t=\d+$/);
    expect((globalThis.window.config as Record<string, unknown>)['VITE_FEATURE_FLAGS']).toEqual({
      'offline-mode-enabled': true,
    });
  });

  it('succeeds even if params.js reload fails after config.js populates required keys', async () => {
    const loadScript = vi.fn(async (src: string): Promise<void> => {
      if (src.startsWith('/data/config.js')) {
        globalThis.window.config = {
          VITE_APP_NAME: 'Waste Plus',
          VITE_BACKEND_URL: 'https://api.example.test',
        };
        return;
      }
      throw new Error('params unavailable');
    });

    await expect(ensureRuntimeConfig({ loadScript, retryDelaysMs: [0] })).resolves.toBe(true);
    expect(loadScript).toHaveBeenCalledTimes(2);
  });

  it('continues retrying when script loads HTTP 200 without populating window.config', async () => {
    const loadScript = vi.fn(async (src: string): Promise<void> => {
      if (src.startsWith('/data/config.js?retry=2')) {
        globalThis.window.config = {
          VITE_APP_NAME: 'Waste Plus',
          VITE_BACKEND_URL: 'https://api.example.test',
        };
      }
    });

    await expect(ensureRuntimeConfig({ loadScript, retryDelaysMs: [0, 0, 0] })).resolves.toBe(true);
    expect(loadScript).toHaveBeenCalledTimes(3);
  });

  it('returns false when retries are exhausted without populating config', async () => {
    const loadScript = vi.fn(async (): Promise<void> => {
      throw new Error('still unavailable');
    });

    await expect(ensureRuntimeConfig({ loadScript, retryDelaysMs: [0, 1] })).resolves.toBe(false);
    expect(loadScript).toHaveBeenCalledTimes(2);
    expect(hasRequiredRuntimeConfig()).toBe(false);
  });

  it('appends and cleans up DOM script tags with the default loader', async () => {
    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      if (script.src.includes('/data/config.js')) {
        globalThis.window.config = {
          VITE_APP_NAME: 'Waste Plus',
          VITE_BACKEND_URL: 'https://api.example.test',
        };
      }
      script.dispatchEvent(new Event('load'));
      return node;
    });

    await expect(ensureRuntimeConfig({ retryDelaysMs: [0] })).resolves.toBe(true);
    expect(appendSpy).toHaveBeenCalledTimes(2);
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
  });

  it('handles DOM script error events cleanly and removes the script element', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      script.dispatchEvent(new Event('error'));
      return node;
    });

    await expect(ensureRuntimeConfig({ retryDelaysMs: [0], requestTimeoutMs: 5000 })).resolves.toBe(
      false,
    );
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
  });

  it('times out and cleans up stalled DOM config script requests', async () => {
    const removeSpies: ReturnType<typeof vi.spyOn>[] = [];
    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      removeSpies.push(vi.spyOn(node as HTMLScriptElement, 'remove'));
      return node;
    });

    await expect(ensureRuntimeConfig({ retryDelaysMs: [0], requestTimeoutMs: 10 })).resolves.toBe(
      false,
    );
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpies[0]).toHaveBeenCalledTimes(1);
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
  });

  it('resolves when config.js succeeds and optional params.js stalls until timeout', async () => {
    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      if (script.src.includes('/data/config.js')) {
        globalThis.window.config = {
          VITE_APP_NAME: 'Waste Plus',
          VITE_BACKEND_URL: 'https://api.example.test',
        };
        script.dispatchEvent(new Event('load'));
      }
      return node;
    });

    await expect(ensureRuntimeConfig({ retryDelaysMs: [0], requestTimeoutMs: 10 })).resolves.toBe(
      true,
    );
    expect(appendSpy).toHaveBeenCalledTimes(2);
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
  });
});
