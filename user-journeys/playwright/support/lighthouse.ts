import type { Page } from "@playwright/test";

/** Pure helpers are mirrored from the frozen Cypress lighthouse helpers. */

export type LighthouseFormFactor = "mobile" | "desktop";

export interface ScreenEmulation {
  mobile: boolean;
  width: number;
  height: number;
  deviceScaleFactor: number;
  disabled: boolean;
}

export interface LighthouseRunOptions {
  formFactor: LighthouseFormFactor;
  screenEmulation: ScreenEmulation;
}

export interface LighthouseReport {
  requestedUrl: string;
  url: string;
  finalUrl: string;
  documentTitle: string;
  lighthouseOptions: LighthouseRunOptions;
  lighthouseConfigSettings: Record<string, unknown>;
  categories: Record<string, number>;
  metrics: Record<string, number | null>;
}

/** Mirrors normalizePath in cypress.config.ts: hash routing wins over pathname. */
export function normalizePath(url: string): string {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.replace(/^#/, "");
    let path = hash || parsed.pathname;
    if (!path) path = "/";
    if (!path.startsWith("/")) path = `/${path}`;
    if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
    return path;
  } catch {
    return url;
  }
}

/** The Gherkin table arrives as playwright-bdd's DataTable argument. */
export interface ThresholdTable {
  raw(): string[][];
}

export function parseThresholdTable(table: ThresholdTable): Record<string, number> {
  const thresholds: Record<string, number> = {};
  for (const row of table.raw()) {
    if (row.length < 2) {
      throw new Error("Each Lighthouse threshold row must have metric and value columns.");
    }
    thresholds[normalizeMetricKey(row[0] ?? "")] = parseThresholdNumber(row[1] ?? "");
  }
  if (Object.keys(thresholds).length === 0) {
    throw new Error("Lighthouse threshold table cannot be empty.");
  }
  return thresholds;
}

const METRIC_ALIASES: Record<string, string> = {
  ttfb: "server-response-time",
  lcp: "largest-contentful-paint",
  fcp: "first-contentful-paint",
  cls: "cumulative-layout-shift",
  tbt: "total-blocking-time",
  fid: "max-potential-fid",
  si: "speed-index",
  interactive: "interactive",
  "loading time": "server-response-time",
  bestpractices: "best-practices",
  "best practices": "best-practices",
  "time to interactive": "interactive",
  "first input delay": "max-potential-fid",
};

export function normalizeMetricKey(metric: string): string {
  const normalized = metric.trim().toLowerCase();
  return METRIC_ALIASES[normalized] ?? normalized;
}

export function parseThresholdNumber(input: string): number {
  const parsed = Number.parseFloat(input.trim());
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`Invalid numeric threshold: "${input}".`);
  }
  return parsed;
}

/** Plain numbers and bare strings are milliseconds; "s" means seconds. */
export function parseTiming(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const value = raw.trim().toLowerCase();
  if (value.endsWith("ms")) return Number.parseFloat(value.slice(0, -2).trim());
  if (value.endsWith("s")) return Number.parseFloat(value.slice(0, -1).trim()) * 1_000;
  return Number.parseFloat(value);
}

export function formatTiming(value: number | null | undefined): string {
  if (value == null) return "N/A";
  if (value < 1) return `${Math.round(value * 1_000)}ms`;
  return `${(value / 1_000).toFixed(2)}s`;
}

export function getLighthouseTaxonomy(id: string): string {
  if (
    ["largest-contentful-paint", "first-contentful-paint", "cumulative-layout-shift"].includes(id)
  ) {
    return "web-vitals";
  }
  if (id.includes("response") || id.includes("network")) return "network";
  if (id.includes("paint") || id.includes("render")) return "rendering";
  if (id.includes("layout") || id.includes("shift")) return "layout";
  return "other";
}

export function getLighthouseSeverity(id: string, value: number | null): string {
  if (value == null) return "info";
  if (id === "largest-contentful-paint") {
    if (value > 6_000) return "critical";
    if (value > 4_000) return "major";
  }
  if (id === "cumulative-layout-shift" && value > 0.25) return "critical";
  if (id === "server-response-time" && value > 600) return "minor";
  return "info";
}

export function severityFromScore(score: number): "info" | "minor" | "major" {
  if (score >= 90) return "info";
  if (score >= 70) return "minor";
  return "major";
}

export const mobileLighthouseOptions: LighthouseRunOptions = {
  formFactor: "mobile",
  screenEmulation: {
    mobile: true,
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    disabled: false,
  },
};

export const desktopLighthouseOptions: LighthouseRunOptions = {
  formFactor: "desktop",
  screenEmulation: {
    mobile: false,
    width: 1_920,
    height: 1_080,
    deviceScaleFactor: 1,
    disabled: false,
  },
};

export function resolveFormFactor(envValue: string | undefined, viewportWidth: number): LighthouseFormFactor {
  const normalized = envValue?.trim().toLowerCase();
  if (normalized === "mobile" || normalized === "desktop") return normalized;
  return Number.isFinite(viewportWidth) && viewportWidth <= 768 ? "mobile" : "desktop";
}

export function resolveLighthouseRunOptions(
  overrides: Partial<LighthouseRunOptions> = {},
  envValue?: string,
  viewportWidth = 1_600,
): LighthouseRunOptions {
  const base = resolveFormFactor(envValue, viewportWidth) === "mobile"
    ? mobileLighthouseOptions
    : desktopLighthouseOptions;
  return { ...base, ...overrides };
}

/** Stable key for the per-worker result cache. */
export function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Loose shape: Playwright's CDPSession overloads are narrower than CDP itself. */
export interface LooseCDPSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  on(event: string, listener: (payload: { method: string; params?: unknown }) => void): unknown;
  off(event: string, listener: (payload: { method: string; params?: unknown }) => void): unknown;
  detach(): Promise<void>;
}

/**
 * Playwright's CDPSession emits a combined `event` ({method, params}) and has no
 * id(); Lighthouse's Puppeteer adapter expects on('*', (method, params) => …),
 * id(), send(), off('*') and detach(). Bridge only those members.
 */
export function asPuppeteerSession(cdp: LooseCDPSession) {
  const wildcard = new Map<
    (method: string, params: unknown) => void,
    (event: { method: string; params?: unknown }) => void
  >();
  return {
    id: () => "pw-lighthouse-handoff",
    send: (method: string, ...params: unknown[]) =>
      cdp.send(method, params[0] as Record<string, unknown> | undefined),
    on(event: string, listener: (...args: unknown[]) => void) {
      if (event === "*") {
        const wrapped = (payload: { method: string; params?: unknown }) =>
          listener(payload.method, payload.params);
        wildcard.set(listener as (method: string, params: unknown) => void, wrapped);
        cdp.on("event", wrapped);
      } else {
        cdp.on(
          event,
          ((params: unknown) => listener(params)) as (payload: {
            method: string;
            params?: unknown;
          }) => void,
        );
      }
      return this;
    },
    off(event: string, listener: (...args: unknown[]) => void) {
      if (event === "*") {
        const wrapped = wildcard.get(listener as (method: string, params: unknown) => void);
        if (wrapped) {
          cdp.off("event", wrapped);
          wildcard.delete(listener as (method: string, params: unknown) => void);
        }
      }
      return this;
    },
    once(event: string, listener: (...args: unknown[]) => void) {
      const wrapped = (...args: unknown[]) => {
        this.off(event, wrapped);
        listener(...args);
      };
      return this.on(event, wrapped);
    },
    detach: () => cdp.detach(),
  };
}

/** Hand the already-authenticated Playwright page straight to Lighthouse. */
export async function runLighthouse(
  page: Page,
  url: string,
  options: LighthouseRunOptions,
): Promise<LighthouseReport> {
  const lighthouse = (await import("lighthouse")).default as unknown as (
    url: string,
    flags: Record<string, unknown>,
    config: unknown,
    puppeteerPage: unknown,
  ) => Promise<{ lhr: Record<string, unknown> }>;

  let config: unknown;
  if (options.formFactor === "desktop") {
    try {
      const desktop = await import("lighthouse/core/config/desktop-config.js");
      config = (desktop as { default?: unknown }).default;
    } catch {
      config = undefined;
    }
  }

  const puppeteerPage = {
    url: () => page.url(),
    target: () => ({
      createCDPSession: async () =>
        asPuppeteerSession(await page.context().newCDPSession(page)),
    }),
  };

  const run = lighthouse(
    url,
    {
      port: 9_333,
      hostname: "127.0.0.1",
      output: "json",
      logLevel: "error",
      disableStorageReset: true,
    },
    config,
    puppeteerPage,
  );
  // Clear the loser's late rejection so a timed-out run stays silent.
  run.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Lighthouse timed out after 120000 ms for ${url}`)),
      120_000,
    );
  });

  let result: { lhr: Record<string, unknown> };
  try {
    result = await Promise.race([run, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }

  const lhr = result.lhr;
  if (!lhr) throw new Error(`Lighthouse failed to generate a report for ${url}`);
  const runtimeError = lhr.runtimeError as { code?: string; message?: string } | undefined;
  if (runtimeError) {
    throw new Error(
      `Lighthouse runtime error for ${url}: [${runtimeError.code}] ${runtimeError.message}`,
    );
  }

  const audits = (lhr.audits ?? {}) as Record<string, { numericValue?: number | null }>;
  const finalUrl = String(lhr.finalDisplayedUrl ?? url);
  return {
    requestedUrl: url,
    url: normalizePath(url),
    finalUrl,
    documentTitle: (await page.title()) || "",
    lighthouseOptions: options,
    lighthouseConfigSettings: (lhr.configSettings ?? {}) as Record<string, unknown>,
    categories: Object.fromEntries(
      Object.entries((lhr.categories ?? {}) as Record<string, { score?: number | null }>)
        .filter(([, value]) => value.score != null)
        .map(([key, value]) => [key, Math.round((value.score ?? 0) * 100)]),
    ),
    metrics: Object.fromEntries(
      Object.entries(audits)
        .filter(([, value]) => value.numericValue != null)
        .map(([key, value]) => [key, value.numericValue ?? null]),
    ),
  };
}
