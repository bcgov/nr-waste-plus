import fs from "node:fs";

import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import { baseURL, VIEWPORT } from "./playwright/env";

const PORTED_FEATURES_FILE = "ported-features.txt";
const DEFAULT_FEATURES = "../cypress/cypress/e2e/*.feature";

function featureSources(): string[] {
  if (process.env.PW_FEATURES) {
    return process.env.PW_FEATURES.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (fs.existsSync(PORTED_FEATURES_FILE)) {
    return fs
      .readFileSync(PORTED_FEATURES_FILE, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  }

  return [DEFAULT_FEATURES];
}

const testDir = defineBddConfig({
  features: featureSources(),
  // Frozen features live outside this package; root at the worktree so the
  // generated spec paths keep their cypress/cypress/e2e segment.
  featuresRoot: "..",
  steps: ["playwright/fixtures/index.ts", "playwright/steps/**/*.ts"],
});

const ciReporters: ["github"][] = process.env.CI ? [["github"]] : [];

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // Keep workers at 1: the Silver route rate-limits per client IP (guide §0),
  // so parallel workers would open fresh contexts back-to-back and fail.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
  outputDir: "test-results",
  use: {
    baseURL,
    viewport: VIEWPORT,
    ignoreHTTPSErrors: true,
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "reports/playwright/junit.xml" }],
    ["json", { outputFile: "reports/playwright/results.json" }],
    [
      "playwright-timeline-reporter",
      { outputFile: "reports/playwright/timeline.html" },
    ],
    ["./playwright/reporters/quality/reporter.ts"],
    ...ciReporters,
  ],
  projects: [
    {
      name: "journeys",
      testDir,
      use: { ...devices["Desktop Chrome"], viewport: VIEWPORT },
    },
  ],
});
