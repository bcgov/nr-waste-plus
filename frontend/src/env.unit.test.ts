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
        'offline-mode-enabled': true,
      },
      VITE_NODE_ENV: 'openshift-test',
    };

    const { env, featureFlags } = await loadEnv();

    expect(env.VITE_APP_NAME).toBe('Runtime Waste Plus');
    expect(env.VITE_NODE_ENV).toBe('openshift-test');
    expect(featureFlags['offline-mode-enabled']).toBe(true);
  });

  it('rejects unexpected runtime config keys', async () => {
    globalThis.window.config = {
      VITE_APP_NAME: 'Runtime Waste Plus',
      UNEXPECTED_KEY: 'malicious',
    };

    await expect(loadEnv()).rejects.toThrow(/Invalid window\.config/);
    await expect(loadEnv()).rejects.toThrow(/UNEXPECTED_KEY/);
  });

  it('rejects non-plain runtime config objects', async () => {
    globalThis.window.config = new Date();

    await expect(loadEnv()).rejects.toThrow(/Invalid window\.config/);
    await expect(loadEnv()).rejects.toThrow(/plain object/i);
  });

  it('rejects invalid feature flag values in strict mode', async () => {
    globalThis.window.config = {
      VITE_FEATURE_FLAGS: {
        'offline-mode-enabled': 'false',
      },
    };

    await expect(loadEnv()).rejects.toThrow(/Invalid VITE_FEATURE_FLAGS/);
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

  it('rejects unknown feature flag names in strict mode', async () => {
    globalThis.window.config = {
      VITE_FEATURE_FLAGS: {
        UNKNOWN_FLAG: true,
      },
    };

    await expect(loadEnv()).rejects.toThrow(/Invalid VITE_FEATURE_FLAGS/);
    await expect(loadEnv()).rejects.toThrow(/UNKNOWN_FLAG/);
  });

  it('falls back to empty flags when flag JSON is malformed in non-strict mode', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_FEATURE_FLAGS', '{');

    const { featureFlags } = await loadEnv();

    expect(featureFlags).toEqual({});
    vi.unstubAllEnvs();
  });

  it('falls back to empty flags when flag values are invalid in non-strict mode', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_FEATURE_FLAGS', '{}');
    globalThis.window.config = {
      VITE_FEATURE_FLAGS: {
        'offline-mode-enabled': 'not-a-boolean',
      },
    };

    const { featureFlags } = await loadEnv();

    expect(featureFlags).toEqual({});
    vi.unstubAllEnvs();
  });

  it('falls back to empty flags when unknown flag names are provided in non-strict mode', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_FEATURE_FLAGS', '{}');
    globalThis.window.config = {
      VITE_FEATURE_FLAGS: {
        UNKNOWN_FLAG: true,
      },
    };

    const { featureFlags } = await loadEnv();

    expect(featureFlags).toEqual({});
    vi.unstubAllEnvs();
  });

  it('defaults all flags to undefined (disabled) when no flags are configured', async () => {
    vi.stubEnv('VITE_FEATURE_FLAGS', '{}');

    const { featureFlags } = await loadEnv();

    expect(featureFlags['offline-mode-enabled']).toBeUndefined();
    vi.unstubAllEnvs();
  });
});
