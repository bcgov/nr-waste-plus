import type { QualitySummary } from "../aggregate.ts";
import type { LighthouseEvent } from "../schema.ts";

type LighthouseOptions = LighthouseEvent["lighthouseOptions"];
type ScreenEmulation = NonNullable<LighthouseOptions["screenEmulation"]>;
type ConfigSettings = LighthouseEvent["lighthouseConfigSettings"];

interface LighthouseReport {
  url: string;
  lighthouseOptions: LighthouseOptions | null;
  lighthouseConfigSettings: ConfigSettings | null;
  categories: LighthouseEvent[];
  metrics: LighthouseEvent[];
  failuresByScenario: Map<string, LighthouseEvent[]>;
}

export function formatTiming(value: number | null | undefined): string {
  if (value == null) return "N/A";
  if (value < 1) return `${Math.round(value * 1000)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

export function formatLighthouseProfile(options: LighthouseOptions | null): string {
  if (!options) return "unknown";

  const formFactor = options.formFactor || "unknown";
  const screen = options.screenEmulation;

  if (!screen) return `${formFactor} (screen emulation: not provided)`;

  return `${formFactor} (${screen.width ?? "?"}x${screen.height ?? "?"}, dpr ${screen.deviceScaleFactor ?? "?"})`;
}

export function formatScreenEmulation(screen: ScreenEmulation | null | undefined): string {
  if (!screen) return "not provided";

  return [
    `mobile=${String(screen.mobile)}`,
    `width=${screen.width ?? "?"}`,
    `height=${screen.height ?? "?"}`,
    `dpr=${screen.deviceScaleFactor ?? "?"}`,
    `disabled=${String(screen.disabled)}`,
  ].join(", ");
}

export function formatConfigSettingsSummary(settings: ConfigSettings | null): string {
  if (!settings || typeof settings !== "object") return "unknown";

  const screen = settings.screenEmulation as ScreenEmulation | undefined;
  const screenSummary = screen
    ? `mobile=${String(screen.mobile)}, ${screen.width ?? "?"}x${screen.height ?? "?"}, dpr=${screen.deviceScaleFactor ?? "?"}`
    : "not provided";

  return [
    `emulatedFormFactor=${settings.emulatedFormFactor ?? "unknown"}`,
    `throttlingMethod=${settings.throttlingMethod ?? "unknown"}`,
    `screenEmulation=${screenSummary}`,
  ].join("; ");
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function serializeLighthouseOptions(options: LighthouseOptions | null): string {
  if (!options) return "unknown";

  const formFactor = options.formFactor || "unknown";
  const screen = options.screenEmulation;

  if (!screen) return `${formFactor}|no-screen-emulation`;

  return [
    formFactor,
    `mobile:${String(screen.mobile)}`,
    `width:${screen.width ?? "na"}`,
    `height:${screen.height ?? "na"}`,
    `dpr:${screen.deviceScaleFactor ?? "na"}`,
    `disabled:${String(screen.disabled)}`,
  ].join("|");
}

export function serializeConfigSettings(settings: ConfigSettings | null): string {
  if (!settings || typeof settings !== "object") return "unknown";

  return JSON.stringify({
    emulatedFormFactor: settings.emulatedFormFactor ?? "unknown",
    throttlingMethod: settings.throttlingMethod ?? "unknown",
    screenEmulation: settings.screenEmulation ?? null,
  });
}

function pickOptions(events: readonly LighthouseEvent[]): LighthouseOptions | null {
  for (const event of events) {
    if (event.lighthouseOptions) return event.lighthouseOptions;
  }
  return null;
}

function pickConfigSettings(events: readonly LighthouseEvent[]): ConfigSettings | null {
  for (const event of events) {
    if (event.lighthouseConfigSettings) return event.lighthouseConfigSettings;
  }
  return null;
}

function buildReports(events: readonly LighthouseEvent[]): LighthouseReport[] {
  const latestByKey = new Map<string, LighthouseEvent>();
  for (const event of events) {
    const key = [
      event.type,
      event.id,
      event.url,
      event.scenario,
      event.threshold ?? "none",
      event.comparison ?? "none",
      serializeLighthouseOptions(event.lighthouseOptions),
      serializeConfigSettings(event.lighthouseConfigSettings),
    ].join("|");
    const existing = latestByKey.get(key);
    if (!existing || event.attempt >= existing.attempt) {
      latestByKey.set(key, event);
    }
  }

  const grouped = new Map<string, LighthouseEvent[]>();
  for (const event of latestByKey.values()) {
    const key = [
      normalizeUrl(event.url),
      serializeLighthouseOptions(event.lighthouseOptions),
      serializeConfigSettings(event.lighthouseConfigSettings),
    ].join("::");
    const group = grouped.get(key) ?? [];
    group.push(event);
    grouped.set(key, group);
  }

  return [...grouped.values()].map((urlEvents) => {
    const failuresByScenario = new Map<string, LighthouseEvent[]>();
    for (const event of urlEvents) {
      if (event.passed) continue;
      const group = failuresByScenario.get(event.scenario) ?? [];
      group.push(event);
      failuresByScenario.set(event.scenario, group);
    }

    return {
      url: normalizeUrl(urlEvents[0].url),
      lighthouseOptions: pickOptions(urlEvents),
      lighthouseConfigSettings: pickConfigSettings(urlEvents),
      categories: urlEvents.filter((event) => event.type === "category"),
      metrics: urlEvents.filter((event) => event.type === "metric"),
      failuresByScenario,
    };
  });
}

function renderReport(report: LighthouseReport): string {
  const lines = [
    `### Path ${report.url}`,
    `- Profile: ${formatLighthouseProfile(report.lighthouseOptions)}`,
    `- Form Factor: ${report.lighthouseOptions?.formFactor || "unknown"}`,
    `- Screen Emulation: ${formatScreenEmulation(report.lighthouseOptions?.screenEmulation)}`,
    `- Effective Config: ${formatConfigSettingsSummary(report.lighthouseConfigSettings)}`,
    "",
    "| Category | Metric | Value | Threshold | Result | Severity | Taxonomy |",
    "| -------- | ------ | --------- | ------- | -------- | -------- | -------- |",
  ];

  for (const category of report.categories) {
    lines.push(
      `| ${category.name} | - | ${category.value} | ${category.comparison} ${category.threshold} | ${category.passed ? "✅ PASS" : "❌ FAIL"} | ${category.severity} | baseline |`,
    );
  }

  for (const metric of report.metrics) {
    lines.push(
      `| - | ${metric.name} | ${formatTiming(metric.value)} | ${metric.comparison} ${formatTiming(metric.threshold)} | ${metric.passed ? "✅ PASS" : "❌ FAIL"} | ${metric.severity} | ${metric.taxonomy} |`,
    );
  }

  lines.push("");

  for (const [scenario, failures] of report.failuresByScenario) {
    lines.push(`#### Failures in ${scenario}`, "");
    lines.push("| Type | Name | Value | Threshold | Severity |");
    lines.push("| ---- | ----- | ----- | --------- | -------- |");
    for (const failure of failures) {
      lines.push(
        `| ${failure.type} | ${failure.name} | ${formatTiming(failure.value)} | ${failure.comparison} ${formatTiming(failure.threshold)} | ${failure.severity} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function renderLighthouse(data: QualitySummary): string {
  if (data.lighthouseEvents.length === 0) {
    return "## Lighthouse Quality Report\n\nNo checks recorded";
  }

  let markdown = "## Lighthouse Quality Report\n\n";
  for (const report of buildReports(data.lighthouseEvents)) {
    markdown += `${renderReport(report)}\n---\n\n`;
  }
  return markdown.slice(0, -1);
}
