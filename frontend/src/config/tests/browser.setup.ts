/* eslint-disable no-console */
import path from 'path';
import { fileURLToPath } from 'url';

import { chromium, firefox, webkit } from '@playwright/test';
import { injectAxe } from 'axe-playwright';

const SELECTED_CLIENT_KEY = 'SELECTED_CLIENT' as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const isAllBrowsers = process.env.ALL_BROWSERS === 'true';

const browserMap = {
  chromium,
  firefox,
  webkit,
} as const;

async function loadAndSaveStorage(browserTypeName: keyof typeof browserMap) {
  const browserType = browserMap[browserTypeName];
  const browser = await browserType.launch();
  const page = await browser.newPage();
  await injectAxe(page);

  console.log(`Global setup - Browser: ${browserTypeName}, url: ${baseURL}`);

  await page.goto(baseURL);

  // By passing the district selection screen by pre selecting a client.
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: SELECTED_CLIENT_KEY, value: '00012797' },
  );

  const authFile = path.join(__dirname, `./user.${browserTypeName}.json`);
  await page.context().storageState({ path: authFile });

  console.log(`[globalSetup] Created: ${authFile}`);
  await browser.close();
}

async function globalSetup() {
  if (isAllBrowsers) {
    for (const name of Object.keys(browserMap)) {
      await loadAndSaveStorage(name as keyof typeof browserMap);
    }
  } else {
    await loadAndSaveStorage('chromium');
  }
}

export default globalSetup;
