import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import { baseURL, VIEWPORT } from "./playwright/env";

const testDir = defineBddConfig({
  features: process.env.PW_FEATURES ?? "cypress/e2e/*.feature",
  steps: ["playwright/fixtures/index.ts", "playwright/steps/**/*.ts"],
});

const ciReporters: ["github"][] = process.env.CI ? [["github"]] : [];

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
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
