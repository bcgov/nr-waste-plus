export function formatTiming(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function severityFromScore(score: number): "info" | "minor" | "major" {
  if (score >= 90) return "info";
  if (score >= 70) return "minor";
  return "major";
}

export interface LighthouseSnapshot {
  requestedUrl?: string;
  finalUrl?: string;
  fetchTime?: string;
  categories?: Record<string, number | null>;
  audits?: Record<string, number | null>;
}

export interface DataTableLike {
  rawTable: string[][];
}

export const mobileLighthouseOptions = {
  formFactor: "mobile",
  screenEmulation: {
    mobile: true,
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    disabled: false,
  },
};

export const normalizeMetricKey = (metric: string): string => {
  const normalized = metric.trim().toLowerCase();

  const aliases: Record<string, string> = {
    bestpractices: "best-practices",
    "best practices": "best-practices",
    ttfb: "server-response-time",
    lcp: "largest-contentful-paint",
    cls: "cumulative-layout-shift",
    tbt: "total-blocking-time",
    si: "speed-index",
    "time to interactive": "interactive",
    "first input delay": "max-potential-fid",
  };

  return aliases[normalized] || normalized;
};

export const parseThresholdNumber = (input: string): number => {
  const parsed = Number.parseFloat(input.trim());
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`Invalid numeric threshold: "${input}".`);
  }

  return parsed;
};

export const parseThresholdTable = (table: DataTableLike): Record<string, number> => {
  const thresholds: Record<string, number> = {};

  for (const row of table.rawTable) {
    if (!Array.isArray(row) || row.length < 2) {
      throw new Error("Each Lighthouse threshold row must have metric and value columns.");
    }

    const metric = normalizeMetricKey(row[0] || "");
    thresholds[metric] = parseThresholdNumber(row[1] || "");
  }

  if (Object.keys(thresholds).length === 0) {
    throw new Error("Lighthouse threshold table cannot be empty.");
  }

  return thresholds;
};

export const runReportTo = (fn: (report: any) => void) => {
  cy
    .url()
    .then((currentUrl) => {
      return cy.runLighthouseAudit(currentUrl)
              .as("lhReport")
              .then(fn);            
    });
};

