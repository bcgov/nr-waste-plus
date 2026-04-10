import { z } from 'zod';

declare global {
  interface Window {
    config?: unknown;
  }
}

/**
 * Supported string runtime config keys that may be injected through public/data/config.js.
 */
const allowedRuntimeEnvConfigSchema = z
  .object({
    VITE_APP_NAME: z.string(),
    VITE_BACKEND_URL: z.string(),
    VITE_BCEID_HELP: z.string(),
    VITE_CLIENT_BASE_URL: z.string(),
    VITE_FAM_DOMAIN: z.string(),
    VITE_FRONTEND_URL: z.string(),
    VITE_IDIR_HELP: z.string(),
    VITE_LEGACY_BASE_URL: z.string(),
    VITE_MOCK_AUTH: z.string(),
    VITE_NODE_ENV: z.string(),
    VITE_USER_POOLS_ID: z.string(),
    VITE_USER_POOLS_WEB_CLIENT_ID: z.string(),
    VITE_ZONE: z.string(),
  })
  .partial()
  .strict();

/**
 * Final merged env contract consumed by the application.
 */
const appEnvSchema = z.looseObject({
  VITE_APP_NAME: z.string(),
  VITE_BACKEND_URL: z.string(),
  VITE_BCEID_HELP: z.string(),
  VITE_CLIENT_BASE_URL: z.string(),
  VITE_FAM_DOMAIN: z.string(),
  VITE_IDIR_HELP: z.string(),
  VITE_LEGACY_BASE_URL: z.string(),
  VITE_NODE_ENV: z.string(),
  VITE_USER_POOLS_ID: z.string(),
  VITE_USER_POOLS_WEB_CLIENT_ID: z.string(),
  VITE_ZONE: z.string(),
  VITE_FRONTEND_URL: z.string().optional(),
  VITE_MOCK_AUTH: z.string().optional(),
});

/**
 * Typed feature flags supported by the application.
 * Add new flags here as they are introduced.
 */
const featureFlagsSchema = z
  .object({
    OFFLINE: z.boolean(),
  })
  .partial()
  .strict();

const runtimeConfigSchema = allowedRuntimeEnvConfigSchema.extend({
  VITE_FEATURE_FLAGS: featureFlagsSchema.optional(),
});

type AppEnv = Record<string, string> & z.infer<typeof appEnvSchema>;
export type FeatureFlags = z.infer<typeof featureFlagsSchema>;
type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

const getStringEnvEntries = (source: Record<string, unknown>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
};

const getValidatedFeatureFlags = (value: unknown): FeatureFlags => {
  if (value == null) {
    return {};
  }

  let parsedValue: unknown = value;
  if (typeof value === 'string') {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      throw new TypeError('Invalid VITE_FEATURE_FLAGS: expected valid JSON.');
    }
  }

  const parsedFlags = featureFlagsSchema.safeParse(parsedValue);
  if (!parsedFlags.success) {
    const issues = parsedFlags.error.issues
      .map(({ path, message }) => `${path.join('.') || '<root>'}: ${message}`)
      .join('; ');

    throw new TypeError(`Invalid VITE_FEATURE_FLAGS: ${issues}`);
  }

  return parsedFlags.data;
};

const getValidatedRuntimeConfig = (config: unknown): RuntimeConfig => {
  if (config == null) {
    return {};
  }

  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError(
      'Invalid window.config: expected a plain object with supported string runtime config values.',
    );
  }

  const parsedConfig = runtimeConfigSchema.safeParse(config);
  if (!parsedConfig.success) {
    const issues = parsedConfig.error.issues
      .map(({ path, message }) => `${path.join('.') || '<root>'}: ${message}`)
      .join('; ');

    throw new TypeError(`Invalid window.config: ${issues}`);
  }

  return parsedConfig.data;
};

const { VITE_FEATURE_FLAGS: viteFeatureFlags, ...viteEnv } = getStringEnvEntries(
  import.meta.env as Record<string, unknown>,
);

const { VITE_FEATURE_FLAGS: runtimeFeatureFlags, ...runtimeEnv } = getValidatedRuntimeConfig(
  globalThis.window?.config,
);

const getValidatedAppEnv = (config: Record<string, string>): AppEnv => {
  const parsedConfig = appEnvSchema.safeParse(config);
  if (!parsedConfig.success) {
    const issues = parsedConfig.error.issues
      .map(({ path, message }) => `${path.join('.') || '<root>'}: ${message}`)
      .join('; ');

    throw new TypeError(`Invalid application env: ${issues}`);
  }

  return parsedConfig.data as AppEnv;
};

/**
 * Runtime environment values merged from Vite and validated optional window-injected config.
 */
export const env: AppEnv = getValidatedAppEnv({
  ...viteEnv,
  ...runtimeEnv,
});

/**
 * Typed feature flags merged from Vite env and optional runtime config.
 */
export const featureFlags: FeatureFlags = {
  ...getValidatedFeatureFlags(viteFeatureFlags),
  ...getValidatedFeatureFlags(runtimeFeatureFlags),
};
