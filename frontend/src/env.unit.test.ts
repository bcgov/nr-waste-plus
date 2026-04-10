import { afterEach, describe, expect, it, vi } from 'vitest';

const loadEnv = async () => {
  vi.resetModules();
  return import('@/env');
};

afterEach(() => {
  globalThis.window.config = undefined;
});

describe('env', () => {
  it('merges supported string runtime config values and typed feature flags', async () => {
    globalThis.window.config = {
      VITE_APP_NAME: 'Runtime Waste Plus',
      VITE_FEATURE_FLAGS: {
        OFFLINE: true,
      },
      VITE_NODE_ENV: 'openshift-test',
    };

    const { env, featureFlags } = await loadEnv();

    expect(env.VITE_APP_NAME).toBe('Runtime Waste Plus');
    expect(env.VITE_NODE_ENV).toBe('openshift-test');
    expect(featureFlags.OFFLINE).toBe(true);
  });

  it('rejects unexpected runtime config keys', async () => {
    globalThis.window.config = {
      VITE_APP_NAME: 'Runtime Waste Plus',
      UNEXPECTED_KEY: 'malicious',
    };

    await expect(loadEnv()).rejects.toThrow(/Invalid window\.config/);
    await expect(loadEnv()).rejects.toThrow(/UNEXPECTED_KEY/);
  });

  it('rejects invalid feature flag values', async () => {
    globalThis.window.config = {
      VITE_FEATURE_FLAGS: {
        OFFLINE: 'false',
      },
    };

    await expect(loadEnv()).rejects.toThrow(/Invalid window\.config/);
    await expect(loadEnv()).rejects.toThrow(/expected boolean/i);
  });

  it('rejects malformed feature flag json strings', async () => {
    vi.stubEnv('VITE_FEATURE_FLAGS', '{');

    await expect(loadEnv()).rejects.toThrow(/Invalid VITE_FEATURE_FLAGS/);
    await expect(loadEnv()).rejects.toThrow(/expected valid JSON/i);

    vi.unstubAllEnvs();
  });

  it('rejects non-string runtime config values', async () => {
    globalThis.window.config = {
      VITE_APP_NAME: 42,
    };

    await expect(loadEnv()).rejects.toThrow(/Invalid window\.config/);
    await expect(loadEnv()).rejects.toThrow(/expected string/i);
  });

  it('rejects unknown feature flag names', async () => {
    globalThis.window.config = {
      VITE_FEATURE_FLAGS: {
        UNKNOWN_FLAG: true,
      },
    };

    await expect(loadEnv()).rejects.toThrow(/Invalid window\.config/);
    await expect(loadEnv()).rejects.toThrow(/UNKNOWN_FLAG/);
  });
});
