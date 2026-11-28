import path from "node:path";

import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["github"],
    [path.resolve(__dirname, "playwright/reporters/quality/reporter.ts")],
    [
      "playwright-timeline-reporter",
      { outputFile: "reports/playwright/timeline.html" },
    ],
  ],
});
