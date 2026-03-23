import { Then } from "@badeball/cypress-cucumber-preprocessor";

interface LighthouseSnapshot {
  requestedUrl?: string;
  finalUrl?: string;
  fetchTime?: string;
  categories?: Record<string, number | null>;
  audits?: Record<string, number | null>;
}

interface DataTableLike {
  rawTable: string[][];
}

const defaultLighthouseThresholds: Record<string, number> = {
  performance: 0,
  accessibility: 0,
  "best-practices": 0,
  seo: 0,
};

const mobileLighthouseOptions = {
  formFactor: "mobile",
  screenEmulation: {
    mobile: true,
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    disabled: false,
  },
};

const normalizeMetricKey = (metric: string): string => {
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

const parseThresholdNumber = (input: string): number => {
  const parsed = Number.parseFloat(input.trim());
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`Invalid numeric threshold: "${input}".`);
  }

  return parsed;
};

const parseThresholdTable = (table: DataTableLike): Record<string, number> => {
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

const runLighthouseAudit = (): Cypress.Chainable<LighthouseSnapshot> => {
  const supportedBrowsers = new Set(["Chrome", "Chromium", "Canary"]);

  if (!supportedBrowsers.has(Cypress.browser.displayName)) {
    throw new Error(
      `Lighthouse requires a Chromium browser. Current browser: "${Cypress.browser.displayName}". Run Cypress with --browser chrome or --browser chromium.`
    );
  }

  return cy
    .lighthouse(defaultLighthouseThresholds, mobileLighthouseOptions)
    .then(() => cy.task("lighthouse:getLatest"))
    .then((latest) => {
      if (!latest || typeof latest !== "object") {
        throw new Error(
          "No Lighthouse result was captured for this scenario. Ensure the run uses Chrome/Chromium and that cypress-audit plugin tasks are registered in cypress.config.ts."
        );
      }

      return latest as LighthouseSnapshot;
    });
};

const readMetricValue = (snapshot: LighthouseSnapshot, metric: string): number | null => {
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

const assertMetricAtLeast = (snapshot: LighthouseSnapshot, metric: string, minimum: number) => {
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

const assertMetricAtMost = (snapshot: LighthouseSnapshot, metric: string, maximum: number) => {
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

const assertMinimumThresholds = (
  snapshot: LighthouseSnapshot,
  thresholds: Record<string, number>
) => {
  for (const [metric, minimum] of Object.entries(thresholds)) {
    assertMetricAtLeast(snapshot, metric, minimum);
  }
};

Then("the Lighthouse score should be at least:", (table: DataTableLike) => {
  const thresholds = parseThresholdTable(table);

  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, thresholds);
  });
});

Then("the page should load quickly", () => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      performance: 80,
    });

    assertMetricAtMost(snapshot, "server-response-time", 800);
    assertMetricAtMost(snapshot, "largest-contentful-paint", 2500);
    assertMetricAtMost(snapshot, "cumulative-layout-shift", 0.1);
  });
});

Then("the page should be mobile friendly", () => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      accessibility: 85,
      seo: 80,
      performance: 70,
    });

    assertMetricAtMost(snapshot, "cumulative-layout-shift", 0.25);
  });
});

Then("the page should follow best practices", () => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      "best-practices": 90,
    });
  });
});

Then("the page should be accessible to most users", () => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      accessibility: 90,
    });
  });
});

Then("the UX quality score should be acceptable", () => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      performance: 80,
      accessibility: 90,
      "best-practices": 90,
      seo: 80,
    });

    assertMetricAtMost(snapshot, "largest-contentful-paint", 2500);
    assertMetricAtMost(snapshot, "cumulative-layout-shift", 0.1);
    assertMetricAtMost(snapshot, "server-response-time", 800);
  });
});

Then("the Lighthouse metric {string} should be at least {string}", (metric: string, minimum: string) => {
  const parsedMinimum = parseThresholdNumber(minimum);

  runLighthouseAudit().then((snapshot) => {
    assertMetricAtLeast(snapshot, metric, parsedMinimum);
  });
});

Then("the Lighthouse metric {string} should be at most {string}", (metric: string, maximum: string) => {
  const parsedMaximum = parseThresholdNumber(maximum);

  runLighthouseAudit().then((snapshot) => {
    assertMetricAtMost(snapshot, metric, parsedMaximum);
  });
});
