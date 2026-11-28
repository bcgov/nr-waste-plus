import { createBdd } from "playwright-bdd";

import {
  createA11yRecorder,
  type A11yRecorder,
} from "./a11y.fixture.ts";
import { test as base } from "./diagnostics.fixture.ts";
import {
  createLighthouseRecorder,
  type LighthouseRecorder,
} from "./lighthouse.fixture.ts";
import { createUiuxRecorder, type UiuxRecorder } from "./uiux.fixture.ts";
import { kindFromTags } from "./shared-context.fixture.ts";
import {
  normalizePath,
  resolveLighthouseRunOptions,
  runLighthouse,
  stableSerialize,
  type LighthouseReport,
  type LighthouseRunOptions,
} from "../support/lighthouse.ts";

type QualityFixtures = {
  a11y: A11yRecorder;
  uiux: UiuxRecorder;
  lighthouse: LighthouseRecorder;
  lighthouseRun: (options?: Partial<LighthouseRunOptions>) => Promise<LighthouseReport>;
};

// One worker process, one cache: two scenarios on the same URL and options
// reuse the single Lighthouse audit (the Cypress task had the same contract).
const reportCache = new Map<string, LighthouseReport>();

export const test = base.extend<QualityFixtures>({
  a11y: async ({}, use, testInfo) => {
    await use(createA11yRecorder(testInfo));
  },
  uiux: async ({}, use, testInfo) => {
    await use(createUiuxRecorder(testInfo));
  },
  lighthouse: async ({}, use, testInfo) => {
    await use(createLighthouseRecorder(testInfo));
  },
  lighthouseRun: async ({ page, $tags }, use) => {
    await use(async (options = {}) => {
      const resolved = resolveLighthouseRunOptions(
        options,
        process.env.LIGHTHOUSE_FORM_FACTOR ?? process.env.lighthouseFormFactor,
        page.viewportSize()?.width,
      );
      const url = page.url();
      const key = `${normalizePath(url)}|${stableSerialize(resolved)}|${kindFromTags($tags)}`;
      const cached = reportCache.get(key);
      if (cached) return cached;
      const report = await runLighthouse(page, url, resolved);
      reportCache.set(key, report);
      return report;
    });
  },
});

export const { Given, When, Then, Before, After } = createBdd(test);
