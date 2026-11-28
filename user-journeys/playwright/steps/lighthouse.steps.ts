import { expect } from "@playwright/test";
import type { DataTable } from "playwright-bdd";

import { test, Then } from "../fixtures";
import type { LighthouseRecorder } from "../fixtures/lighthouse.fixture.ts";
import {
  formatTiming,
  getLighthouseSeverity,
  getLighthouseTaxonomy,
  normalizeMetricKey,
  normalizePath,
  parseThresholdTable,
  parseTiming,
  severityFromScore,
  type LighthouseReport,
} from "../support/lighthouse.ts";

const APP_TITLE = "Waste Plus";

/** Exit-A hard gate: Lighthouse must audit the requested route, not the landing shell. */
function assertAudited(report: LighthouseReport): void {
  expect(
    normalizePath(report.finalUrl),
    "Lighthouse audited the requested route (not a redirect to /)",
  ).toBe(normalizePath(report.requestedUrl));
  expect(
    report.documentTitle,
    "the audited document title contains the app title",
  ).toContain(APP_TITLE);
}

async function recordCategory(
  recorder: LighthouseRecorder,
  report: LighthouseReport,
  id: string,
  threshold: number,
): Promise<void> {
  const value = report.categories[id] ?? 0;
  await recorder.record({
    type: "category",
    id,
    name: id,
    value,
    threshold,
    comparison: ">=",
    passed: value >= threshold,
    severity: severityFromScore(value),
    taxonomy: id,
    url: report.url,
    finalUrl: report.finalUrl,
    documentTitle: report.documentTitle,
    lighthouseOptions: report.lighthouseOptions,
    lighthouseConfigSettings: report.lighthouseConfigSettings,
  });
  expect(
    value,
    `Lighthouse ${id} score is ${value}, expected at least ${threshold}`,
  ).toBeGreaterThanOrEqual(threshold);
}

async function recordMetric(
  recorder: LighthouseRecorder,
  report: LighthouseReport,
  alias: string,
  threshold: number,
  annotations: { type: string; description?: string; location?: unknown }[],
): Promise<void> {
  const id = normalizeMetricKey(alias);
  const value = report.metrics[id] ?? 0;
  const passed = value <= threshold;
  await recorder.record({
    type: "metric",
    id,
    name: alias,
    value,
    threshold,
    comparison: "<=",
    passed,
    severity: getLighthouseSeverity(id, value),
    taxonomy: getLighthouseTaxonomy(id),
    url: report.url,
    finalUrl: report.finalUrl,
    documentTitle: report.documentTitle,
    lighthouseOptions: report.lighthouseOptions,
    lighthouseConfigSettings: report.lighthouseConfigSettings,
  });
  // Timing metrics are recorded on every run but never fail a scenario: they
  // depend on shared-route throttling and backend latency, not just app code.
  if (!passed) {
    annotations.push({
      type: "lighthouse-warning",
      description: `Lighthouse metric '${alias}' (${id}) is ${formatTiming(value)}, expected at most ${formatTiming(threshold)}`,
    });
  }
}

Then(
  "the lighthouse score should be at least:",
  async ({ lighthouse, lighthouseRun }, table: DataTable) => {
    const thresholds = parseThresholdTable(table);
    const report = await lighthouseRun();
    for (const [id, threshold] of Object.entries(thresholds)) {
      await recordCategory(lighthouse, report, id, threshold);
    }
    assertAudited(report);
  },
);

Then(
  "the lighthouse metric {string} should be at most {string}",
  async ({ lighthouse, lighthouseRun }, alias: string, rawMax: string) => {
    const report = await lighthouseRun();
    await recordMetric(lighthouse, report, alias, parseTiming(rawMax), test.info().annotations);
    assertAudited(report);
  },
);

Then("the UX quality score should be acceptable", async ({ lighthouse, lighthouseRun }) => {
  const report = await lighthouseRun();
  for (const [id, threshold] of Object.entries({
    performance: 75,
    accessibility: 90,
    seo: 80,
    "best-practices": 90,
  })) {
    await recordCategory(lighthouse, report, id, threshold);
  }
  const annotations = test.info().annotations;
  await recordMetric(lighthouse, report, "cls", 0.1, annotations);
  await recordMetric(lighthouse, report, "lcp", 2_500, annotations);
  await recordMetric(lighthouse, report, "ttfb", 95, annotations);
  assertAudited(report);
});
