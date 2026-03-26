import { 
  LighthouseReport,
  LighthouseAssertionEvent,
  getLighthouseSeverity,
  getLighthouseTaxonomy,
} from "../perf";

export const formatTiming = (value: number | null | undefined): string => {
  if (value == null) return "N/A";

  if (value < 1) return `${Math.round(value * 1000)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
};

export const parseTiming = (raw: string | number): number => {
  if (typeof raw === "number") return raw;

  const value = raw.trim().toLowerCase();

  if (value.endsWith("ms")) {
    return parseFloat(value.replace("ms", "").trim());
  }

  if (value.endsWith("s")) {
    return parseFloat(value.replace("s", "").trim()) * 1000;
  }

  // plain number → assume milliseconds
  return parseFloat(value);
};

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
    // Core Web Vitals
    ttfb: "server-response-time",
    lcp: "largest-contentful-paint",
    fcp: "first-contentful-paint",
    cls: "cumulative-layout-shift",
    tbt: "total-blocking-time",

    // Additional useful metrics
    fid: "max-potential-fid",
    si: "speed-index",
    interactive: "interactive",

    "loading time": "server-response-time",
    bestpractices: "best-practices",
    "best practices": "best-practices",  
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

export const expectLighthouse = (report: LighthouseReport) => {
  const scenario = Cypress.currentTest.title;

  const record = (assertion: {
    id: string;
    name: string;
    value: number | null;
    threshold: number;
    comparison: "gte" | "lte";
    type: "category" | "metric" | "lighthouse:record";
    url: string;
  }) => {
    const { id, name, value, threshold, comparison, url, type } = assertion;

    const safeValue = value ?? 0; // Treat null/undefined as 0 for assertion purposes

    const passed =
      comparison === "gte"
        ? safeValue >= threshold
        : safeValue <= threshold;

    const event: LighthouseAssertionEvent = {  
      type,
      id,
      name,
      value,      
      threshold,
      comparison,
      passed,
      severity: getLighthouseSeverity(id, value),
      taxonomy: getLighthouseTaxonomy(id),
      url,
      scenario,
      timestamp: new Date().toISOString(),
    };

    return cy.task("lighthouse:record", [event]);
  };
  
  return {
    category: (name: string) => ({
      toBeAtLeast: (threshold: number) => {
        const value = report.categories[name];
        record({
          id: name,
          name,
          value,
          threshold,
          comparison: "gte",
          type: 'category',
          url: report.url,
        })
        .then(() =>
          expect(value,`Lighthouse ${name} score is ${value}, expected at least ${threshold}`).to.be.gte(threshold)
        );
      },
    }),

    metric: (alias: string) => {
      const id = normalizeMetricKey(alias);
      const name = alias;

      return {
        toBeAtMost: (rawThreshold: string | number) => {
          const threshold = parseTiming(rawThreshold);
          const value = report.metrics[id];
          record({
            id,
            name,
            value,
            threshold,
            comparison: "lte",
            type: 'metric',
            url: report.url,
          })
          .then(() =>
            expect(value, `Lighthouse metric '${name}' (${id}) is ${formatTiming(value)}, expected at most ${formatTiming(threshold)}`).to.be.lte(threshold)
          );
        },

        toBeAtLeast: (rawThreshold: string | number) => {
          const threshold = parseTiming(rawThreshold);
          const value = report.metrics[id];
          record({
            id,
            name,
            value,
            threshold,
            comparison: "gte",
            type: 'metric',
            url: report.url,
          })
          .then(() =>
            expect(value, `Lighthouse metric '${name}' (${id}) is ${formatTiming(value)}, expected at least ${formatTiming(threshold)}`).to.be.gte(threshold)
          );
        },
      };
    },
  };
};
