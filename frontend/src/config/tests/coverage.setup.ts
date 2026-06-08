import fs from 'fs';
import path from 'path';

import { test as base, type BrowserContext, type Page } from '@playwright/test';
import v8toIstanbul from 'v8-to-istanbul';

const COVERAGE_DIR = path.resolve(process.cwd(), '.nyc_output');

export const test = base.extend<{
  context: BrowserContext;
  page: Page;
}>({
  context: async ({ browser, storageState }, provide, testInfo) => {
    const context = await browser.newContext({ ...testInfo.project.use, storageState });
    await provide(context);
    await context.close(); // clean up
  },

  page: async ({ context }, provide, testInfo) => {
    const isChromium = testInfo.project.metadata.browserName === 'chromium';
    const coverageEnabled = isChromium && process.env.VITE_COVERAGE === 'true';
    const page = await context.newPage();

    if (coverageEnabled) {
      await page.coverage.startJSCoverage({ reportAnonymousScripts: true });
    }

    await provide(page);

    if (!coverageEnabled) return;

    const jsCoverage = await page.coverage.stopJSCoverage();

    if (!fs.existsSync(COVERAGE_DIR)) {
      fs.mkdirSync(COVERAGE_DIR, { recursive: true });
    }

    for (const entry of jsCoverage) {
      if (!entry.url.startsWith(`${testInfo.project.use.baseURL}/src`)) continue;

      const absPath = entry.url.replace(testInfo.project.use.baseURL ?? '', process.cwd());
      if (!fs.existsSync(absPath)) {
        // Skipping, file not found
        continue;
      }

      const sourceCode = fs.readFileSync(absPath, 'utf-8');
      const converter = v8toIstanbul(absPath, 0, { source: sourceCode });
      await converter.load();
      converter.applyCoverage(entry.functions);

      const istanbulCoverage = converter.toIstanbul();
      const safeTestId = testInfo.testId.replace(/\W+/g, '_');
      const fileName = `coverage-${path.basename(absPath).replace(/\W+/g, '_')}-${safeTestId}.json`;
      const outPath = path.join(COVERAGE_DIR, fileName);
      fs.writeFileSync(outPath, JSON.stringify(istanbulCoverage, null, 2));
    }
  },
});
