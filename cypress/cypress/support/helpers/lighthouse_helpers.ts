
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

export const runLighthouseAudit = (): Cypress.Chainable<LighthouseSnapshot> => {
  const supportedBrowsers = new Set(["Chrome", "Chromium", "Canary"]);

  if (!supportedBrowsers.has(Cypress.browser.displayName)) {
    throw new Error(
      `Lighthouse requires a Chromium browser. Current browser: "${Cypress.browser.displayName}". Run Cypress with --browser chrome or --browser chromium.`
    );
  }

  return cy.url().then((url) =>
    cy.task(
      "lighthouse",
      {
        url,
        formFactor: mobileLighthouseOptions.formFactor,
        screenEmulation: mobileLighthouseOptions.screenEmulation,
      },
      { timeout: 120000 }
    ) as Cypress.Chainable<LighthouseSnapshot>
  );
};

export const readMetricValue = (snapshot: LighthouseSnapshot, metric: string): number | null => {
  const key = normalizeMetricKey(metric);

  if (snapshot.categories && key in snapshot.categories) {
    const categoryValue = snapshot.categories[key];
    return typeof categoryValue === "number" ? categoryValue : null;
  }

  if (snapshot.audits && key in snapshot.audits) {
    const auditValue = snapshot.audits[key];
    return typeof auditValue === "number" ? auditValue : null;
  }

  return null;
};

export const assertMetricAtLeast = (snapshot: LighthouseSnapshot, metric: string, minimum: number) => {
  const value = readMetricValue(snapshot, metric);
  const normalizedMetric = normalizeMetricKey(metric);

  if (value === null) {
    throw new Error(`Lighthouse metric "${normalizedMetric}" was not present in the report.`);
  }

  expect(
    value,
    `Lighthouse metric "${normalizedMetric}" should be at least ${minimum}. Actual: ${value}`
  ).to.be.gte(minimum);
};

export const assertMetricAtMost = (snapshot: LighthouseSnapshot, metric: string, maximum: number) => {
  const value = readMetricValue(snapshot, metric);
  const normalizedMetric = normalizeMetricKey(metric);

  if (value === null) {
    throw new Error(`Lighthouse metric "${normalizedMetric}" was not present in the report.`);
  }

  expect(
    value,
    `Lighthouse metric "${normalizedMetric}" should be at most ${maximum}. Actual: ${value}`
  ).to.be.lte(maximum);
};

export const assertMinimumThresholds = (
  snapshot: LighthouseSnapshot,
  thresholds: Record<string, number>
) => {
  for (const [metric, minimum] of Object.entries(thresholds)) {
    assertMetricAtLeast(snapshot, metric, minimum);
  }
};
