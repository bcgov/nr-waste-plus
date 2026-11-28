import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import { baseURL, VIEWPORT } from "./playwright/env";

const LOGOUTS_FEATURE = "../cypress/cypress/e2e/logouts.feature";
const LOGOUTS_SPEC = /logouts\.feature\.spec\.js$/;
const LIGHTHOUSE_FEATURES = [
  "../cypress/cypress/e2e/lighthouse.feature",
  "../cypress/cypress/e2e/ux-quality.feature",
];

// reporting_unit_details passed twice against PR12 after the Legacy-data tag
// fix (CI run 46169823928), so its scenarios now run in the default journey.
// lighthouse + ux-quality are first-class scenarios in their own project.
const DEFAULT_FEATURES = [
  "../cypress/cypress/e2e/lighthouse.feature",
  "../cypress/cypress/e2e/ux-quality.feature",
  "../cypress/cypress/e2e/screen-load.feature",
  "../cypress/cypress/e2e/sso-smoke.feature",
  "../cypress/cypress/e2e/unauthorized-access.feature",
  "../cypress/cypress/e2e/theme-toggle.feature",
  "../cypress/cypress/e2e/search.feature",
  "../cypress/cypress/e2e/accessibility.feature",
  "../cypress/cypress/e2e/keyboard-navigation.feature",
  "../cypress/cypress/e2e/announcements.feature",
  "../cypress/cypress/e2e/logouts.feature",
  "../cypress/cypress/e2e/block_details.feature",
  "../cypress/cypress/e2e/login-button.feature",
  "../cypress/cypress/e2e/my-profile.feature",
  "../cypress/cypress/e2e/reporting_unit_details.feature",
];

function featureSources(): string[] {
  if (process.env.PW_FEATURES) {
    return process.env.PW_FEATURES.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return DEFAULT_FEATURES;
}

/*
 * PW_FEATURES keeps working for both projects:
 *   - unset: sources come from DEFAULT_FEATURES; logouts.feature stays listed
 *     there and is split out of journeys into the dedicated teardown project.
 *   - set: comma-separated sources are split the same way. To run only the
 *     logout journey, use
 *     `PW_FEATURES=../cypress/cypress/e2e/logouts.feature npx bddgen && npx playwright test --project=logouts`
 *     (omit --no-deps so `setup` still refreshes the BCeID session first).
 */
const requestedFeatures = featureSources();
const logoutsRequested = requestedFeatures.includes(LOGOUTS_FEATURE);
const lighthouseRequested = LIGHTHOUSE_FEATURES.filter((feature) =>
  requestedFeatures.includes(feature),
);
const journeysFeatures = requestedFeatures.filter(
  (feature) => feature !== LOGOUTS_FEATURE && !LIGHTHOUSE_FEATURES.includes(feature),
);
const steps = ["playwright/fixtures/index.ts", "playwright/steps/**/*.ts"];

// Each project owns its generated specs: bddgen would otherwise overwrite the
// other project's output (playwright-bdd multi-project contract).
const testDir = defineBddConfig({
  features: journeysFeatures,
  // Frozen features live outside this package; root at the worktree so the
  // generated spec paths keep their cypress/cypress/e2e segment.
  featuresRoot: "..",
  steps,
  outputDir: ".features-gen/journeys",
});

const logoutsTestDir = defineBddConfig({
  features: [LOGOUTS_FEATURE],
  featuresRoot: "..",
  steps,
  outputDir: ".features-gen/logouts",
});

// The Lighthouse project owns its generated specs so it cannot overwrite the
// journeys output. Both features are in DEFAULT_FEATURES after three green
// consecutive runs; PW_FEATURES still narrows the project for focused runs.
const lighthouseTestDir = lighthouseRequested.length
  ? defineBddConfig({
      features: lighthouseRequested,
      featuresRoot: "..",
      steps,
      outputDir: ".features-gen/lighthouse",
    })
  : ".features-gen/lighthouse";

const ciReporters: Array<["github"] | ["blob"]> = process.env.CI
  ? [["github"], ["blob"]]
  : [];

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
      name: "setup",
      testDir: "playwright/auth",
      testMatch: /auth\.setup\.ts/,
      // Playwright teardowns run after every project that depends on `setup`,
      // and unlike a normal dependency they also run when a journey fails.
      // The logout performs a real IdP logout, so it must be the last test.
      teardown: "logouts",
      timeout: 90_000,
      use: { trace: "off", screenshot: "off", video: "off" },
    },
    {
      name: "journeys",
      testDir,
      // Defense in depth: the split above already removes the feature, but a
      // stale generated spec must never move the real logout into journeys.
      testIgnore: LOGOUTS_SPEC,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: VIEWPORT },
    },
    {
      name: "logouts",
      testDir: logoutsTestDir,
      // Keep the teardown project empty when logouts is not requested at all.
      testIgnore: logoutsRequested ? undefined : LOGOUTS_SPEC,
      use: { ...devices["Desktop Chrome"], viewport: VIEWPORT },
    },
    ...(lighthouseRequested.length
      ? [
          {
            name: "lighthouse",
            testDir: lighthouseTestDir,
            dependencies: ["setup"],
            timeout: 180_000,
            expect: { timeout: 30_000 },
            workers: 1,
            use: {
              ...devices["Desktop Chrome"],
              viewport: VIEWPORT,
              launchOptions: { args: ["--remote-debugging-port=9333"] },
              trace: "off" as const,
              video: "off" as const,
              screenshot: "only-on-failure" as const,
            },
          },
        ]
      : []),
  ],
});
