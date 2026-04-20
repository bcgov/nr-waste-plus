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
 *
 * ### Deprecating a flag
 * 1. Add the key to `deprecatedFlagKeys` below with a comment stating the target removal sprint.
 * 2. Active deprecated flags emit a `console.warn` at startup so the team is notified.
 * 3. Once all consumers are migrated, remove the key from both this schema and `deprecatedFlagKeys`.
 *
 * ### Unknown-flag lint check
 * The exported `featureFlags` object is typed as `FeatureFlags` (derived from this strict Zod
 * schema). TypeScript's strict mode makes accessing any undeclared key a compile-time error,
 * so no additional ESLint rule is needed — the type system is the enforcement mechanism.
 */
const featureFlagsSchema = z
  .object({
    'offline-mode-enabled': z.boolean(),
  })
  .partial()
  .strict();

/**
 * Flag keys that have been deprecated and are scheduled for removal.
 * Populate this set when a flag enters its deprecation period; remove the entry
 * once the flag has been fully removed from the schema and all configurations.
 *
 * @example
 * // When deprecating 'offline-mode-enabled' targeting Sprint 12 removal:
 * const deprecatedFlagKeys: ReadonlySet<keyof FeatureFlags> = new Set([
 *   'offline-mode-enabled', // deprecated Sprint 10 — remove in Sprint 12
 * ]);
 */
const deprecatedFlagKeys: ReadonlySet<keyof FeatureFlags> = new Set([
  // No flags are currently in deprecation.
]);

const runtimeConfigSchema = allowedRuntimeEnvConfigSchema.extend({
  // Accepted as unknown here so that flag-specific validation errors are reported
  // as VITE_FEATURE_FLAGS errors rather than generic window.config shape errors.
  VITE_FEATURE_FLAGS: z.unknown().optional(),
});

type AppEnv = Record<string, string> & z.infer<typeof appEnvSchema>;
export type FeatureFlags = z.infer<typeof featureFlagsSchema>;
type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

/**
 * True when running with Vite mode set to `test`. Enables strict (throw)
 * behaviour for feature-flag validation so that misconfigured flags fail fast
 * in CI while the production runtime degrades gracefully.
 */
const isStrictFlagValidation = import.meta.env.MODE === 'test';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

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
      if (isStrictFlagValidation) {
        throw new TypeError('Invalid VITE_FEATURE_FLAGS: expected valid JSON.');
      }
      console.warn('[env] VITE_FEATURE_FLAGS contains invalid JSON. Falling back to no flags.');
      return {};
    }
  }

  const parsedFlags = featureFlagsSchema.safeParse(parsedValue);
  if (!parsedFlags.success) {
    const issues = parsedFlags.error.issues
      .map(({ path, message }) => `${path.join('.') || '<root>'}: ${message}`)
      .join('; ');

    if (isStrictFlagValidation) {
      throw new TypeError(`Invalid VITE_FEATURE_FLAGS: ${issues}`);
    }
    console.warn(`[env] VITE_FEATURE_FLAGS has invalid values (${issues}). Falling back to no flags.`);
    return {};
  }

  return parsedFlags.data;
};

const getValidatedRuntimeConfig = (config: unknown): RuntimeConfig => {
  if (config == null) {
    return {};
  }

  if (!isPlainObject(config)) {
    throw new TypeError(
      'Invalid window.config: expected a plain object with an Object or null prototype and supported runtime config values.',
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
 * Deprecated active flags emit a console warning at startup.
 */
export const featureFlags: FeatureFlags = (() => {
  const merged: FeatureFlags = {
    ...getValidatedFeatureFlags(viteFeatureFlags),
    ...getValidatedFeatureFlags(runtimeFeatureFlags),
  };

  for (const key of deprecatedFlagKeys) {
    if (merged[key] !== undefined) {
      console.warn(
        `[env] Feature flag '${key}' is deprecated and scheduled for removal. Migrate all consumers before the target sprint.`,
      );
    }
  }

  return merged;
})();
