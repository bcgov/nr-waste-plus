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
    // Extract only valid BrowserContextOptions from testInfo.project.use
    // (avoid spreading test-runner-only options like video, trace, headless, device, baseURL)
    const { viewport, ignoreHTTPSErrors, baseURL } = testInfo.project.use;
    const context = await browser.newContext({
      viewport,
      ignoreHTTPSErrors,
      baseURL,
      storageState,
    });
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
      const baseURL = testInfo.project.use.baseURL ?? '';
      // Dev server: /src/ URLs (untransformed); Production build: /assets/ chunks (inline sourcemap)
      const isDevSource = entry.url.startsWith(`${baseURL}/src`);
      const isProdChunk = entry.url.includes('/assets/') && entry.url.endsWith('.js');
      if (!isDevSource && !isProdChunk) continue;

      let scriptPath: string;
      let sourceCode: string;

      if (isDevSource) {
        scriptPath = entry.url.replace(baseURL, process.cwd());
        if (!fs.existsSync(scriptPath)) continue;
        sourceCode = fs.readFileSync(scriptPath, 'utf-8');
      } else {
        // Production chunk: entry.source contains bundle text with embedded inline sourcemap
        if (!entry.source) continue;
        scriptPath = entry.url;
        sourceCode = entry.source;
      }

      const converter = v8toIstanbul(scriptPath, 0, { source: sourceCode });
      await converter.load();
      converter.applyCoverage(entry.functions);

      const istanbulCoverage = converter.toIstanbul();
      const safeTestId = testInfo.testId.replace(/\W+/g, '_');
      const fileName = `coverage-${path.basename(scriptPath).replace(/\W+/g, '_')}-${safeTestId}.json`;
      const outPath = path.join(COVERAGE_DIR, fileName);
      fs.writeFileSync(outPath, JSON.stringify(istanbulCoverage, null, 2));
    }
  },
});
