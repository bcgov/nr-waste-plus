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
    VITE_APP_NAME: z.string().min(1),
    VITE_BACKEND_URL: z.string().min(1),
    VITE_BCEID_HELP: z.string().min(1),
    VITE_CLIENT_BASE_URL: z.string().min(1),
    VITE_FAM_DOMAIN: z.string().min(1),
    VITE_FRONTEND_URL: z.string().min(1),
    VITE_IDIR_HELP: z.string().min(1),
    VITE_LEGACY_BASE_URL: z.string().min(1),
    VITE_MOCK_AUTH: z.string().min(1),
    VITE_NODE_ENV: z.string().min(1),
    VITE_USER_POOLS_ID: z.string().min(1),
    VITE_USER_POOLS_WEB_CLIENT_ID: z.string().min(1),
    VITE_ZONE: z.string().min(1),
  })
  .partial()
  .strict();

/**
 * Final merged env contract consumed by the application.
 */
const appEnvSchema = z.looseObject({
  VITE_APP_NAME: z.string().min(1),
  VITE_BACKEND_URL: z.string().min(1),
  VITE_BCEID_HELP: z.string().min(1),
  VITE_CLIENT_BASE_URL: z.string().min(1),
  VITE_FAM_DOMAIN: z.string().min(1),
  VITE_IDIR_HELP: z.string().min(1),
  VITE_LEGACY_BASE_URL: z.string().min(1),
  VITE_NODE_ENV: z.string().min(1),
  VITE_USER_POOLS_ID: z.string().min(1),
  VITE_USER_POOLS_WEB_CLIENT_ID: z.string().min(1),
  VITE_ZONE: z.string().min(1),
  VITE_FRONTEND_URL: z.string().min(1).optional(),
  VITE_MOCK_AUTH: z.string().min(1).optional(),
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
    'bookmark-ru-enabled': z.boolean(),
    'reporting-unit-details-enabled': z.boolean(),
    'reporting-unit-create-enabled': z.boolean(),
    'configuration-enabled': z.boolean(),
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

/**
 * Returns `true` when `value` is a plain object (created via `{}` or `Object.create(null)`).
 *
 * Rejects arrays, `null`, and instances of non-Object classes so that the
 * schema validators can safely index into the value.
 *
 * @param value - The value to test.
 * @returns `true` if the value is a plain object, otherwise `false`.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Filters a source object to only string-valued entries.
 *
 * `import.meta.env` contains non-string values (e.g. `MODE`, boolean flags)
 * that must be excluded before merging into the strongly-typed app env.
 *
 * @param source - The raw object to filter.
 * @returns A new object containing only the string-valued properties.
 */
const getStringEnvEntries = (source: Record<string, unknown>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
};

/**
 * Parses and validates the raw `VITE_FEATURE_FLAGS` value into a typed {@link FeatureFlags} object.
 *
 * Accepts `undefined`/`null` (returns `{}`), a JSON string, or a pre-parsed object.
 * In test mode (`MODE === 'test'`) validation errors throw immediately so that
 * misconfigured flags are caught in CI. In all other environments the function
 * degrades gracefully and returns `{}`.
 *
 * @param value - The raw feature-flags value from the environment or window config.
 * @returns A validated {@link FeatureFlags} object; `{}` on any validation failure in non-test mode.
 * @throws {TypeError} In test mode when the value cannot be parsed or contains invalid flag values.
 */
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
      // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.warn(
      `[env] VITE_FEATURE_FLAGS has invalid values (${issues}). Falling back to no flags.`,
    );
    return {};
  }

  return parsedFlags.data;
};

/**
 * Validates the shape of the `window.config` runtime-injection object.
 *
 * Runtime config is injected by Caddy at startup by serving `public/data/config.js`
 * with environment-variable substitution. This function ensures only known, safe
 * keys are merged into the application environment.
 *
 * @param config - The raw `window.config` value.
 * @returns A typed {@link RuntimeConfig} object; `{}` when config is `null`/`undefined`.
 * @throws {TypeError} When config is a non-plain-object or contains unknown/invalid keys.
 */
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

/**
 * Validates the merged environment object against the required app env schema.
 *
 * Called once at module initialisation time. Throws immediately if any required
 * environment variable is missing, ensuring the app fails fast rather than
 * rendering with broken configuration.
 *
 * @param config - The merged raw env object (Vite env + runtime overrides).
 * @returns The validated and typed {@link AppEnv}.
 * @throws {TypeError} When any required env var is absent or of the wrong type.
 */
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
      // eslint-disable-next-line no-console
      console.warn(
        `[env] Feature flag '${key}' is deprecated and scheduled for removal. Migrate all consumers before the target sprint.`,
      );
    }
  }

  return merged;
})();
