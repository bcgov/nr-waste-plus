const CONFIG_SCRIPT_PATH = '/data/config.js';
const PARAMS_SCRIPT_PATH = '/data/params.js';
const DEFAULT_RETRY_DELAYS_MS: readonly number[] = [250, 750, 1500];
const DEFAULT_SCRIPT_TIMEOUT_MS = 3000;

export interface RuntimeConfigLoaderOptions {
  retryDelaysMs?: readonly number[];
  requestTimeoutMs?: number;
  loadScript?: (src: string) => Promise<void>;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const waitMs = (ms: number): Promise<void> => {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
};

const appendAndAwaitScript = (src: string, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error(`Cannot load runtime config script "${src}" without a DOM document.`));
      return;
    }

    const target = document.head ?? document.documentElement;
    if (!target) {
      reject(new Error(`Cannot load runtime config script "${src}" without a document root.`));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;

    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;

    const cleanup = (): void => {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      script.remove();
    };

    const handleLoad = (): void => {
      cleanup();
      resolve();
    };

    const handleError = (): void => {
      cleanup();
      reject(new Error(`Failed to load runtime config script "${src}".`));
    };

    const handleTimeout = (): void => {
      cleanup();
      reject(new Error(`Timed out loading runtime config script "${src}".`));
    };

    timeoutId = globalThis.setTimeout(handleTimeout, timeoutMs);
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    target.appendChild(script);
  });

/**
 * Returns `true` when required application config (`VITE_APP_NAME` and `VITE_BACKEND_URL`)
 * is available from either build-time Vite env or runtime `window.config`.
 */
export const hasRequiredRuntimeConfig = (): boolean => {
  const buildEnv = import.meta.env as Record<string, unknown>;
  const rawWindowConfig = globalThis.window?.config;
  const runtimeConfig = isPlainRecord(rawWindowConfig) ? rawWindowConfig : {};

  const appName = runtimeConfig['VITE_APP_NAME'] ?? buildEnv['VITE_APP_NAME'];
  const backendUrl = runtimeConfig['VITE_BACKEND_URL'] ?? buildEnv['VITE_BACKEND_URL'];

  return isNonEmptyString(appName) && isNonEmptyString(backendUrl);
};

/**
 * Ensures runtime config is present before importing modules that validate `env`.
 * Retries `/data/config.js` (followed by `/data/params.js`) when initial deferred script
 * loading fails transiently, while returning immediately on already-configured loads.
 */
export const ensureRuntimeConfig = async (
  options: RuntimeConfigLoaderOptions = {},
): Promise<boolean> => {
  if (hasRequiredRuntimeConfig()) {
    return true;
  }

  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_SCRIPT_TIMEOUT_MS;
  const loadScript =
    options.loadScript ??
    ((src: string): Promise<void> => appendAndAwaitScript(src, requestTimeoutMs));

  for (let index = 0; index < retryDelaysMs.length; index += 1) {
    await waitMs(retryDelaysMs[index] ?? 0);

    const attempt = index + 1;
    const cacheBust = `retry=${attempt}&t=${Date.now()}`;

    try {
      await loadScript(`${CONFIG_SCRIPT_PATH}?${cacheBust}`);
    } catch {
      continue;
    }

    if (hasRequiredRuntimeConfig()) {
      try {
        await loadScript(`${PARAMS_SCRIPT_PATH}?${cacheBust}`);
      } catch {
        // Optional feature flags in params.js degrade cleanly in env.ts if unavailable.
      }
      return true;
    }
  }

  return hasRequiredRuntimeConfig();
};
