/* eslint-disable no-console */
import path from 'path';
import { fileURLToPath } from 'url';

import { chromium, firefox, webkit, type Page } from '@playwright/test';
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

async function authenticate(
  page: Page,
  username: string,
  password: string,
  provider: string,
): Promise<void> {
  // Fill credentials (use env vars for security)
  console.log(`Global setup - Auth: ${username} via ${provider}`);
  await page.click(`[data-testid="landing-button__${provider}"]`);
  await page.waitForSelector('#user');

  console.log(`Filling credentials for user: ${username}`);
  await page.fill('#user', username);
  await page.fill('#password', password);

  console.log('Submitting login form');
  await page.click('input[name="btnSubmit"]');

  // Wait for navigation to authenticated page
  console.log('Waiting for authentication to complete...');
  await page.waitForLoadState('networkidle');

  console.log('Authentication verified successfully');
}

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
    { key: SELECTED_CLIENT_KEY, value: '90000001' },
  );

  if (process.env.TEST_BCEID_USERNAME && process.env.TEST_BCEID_PASSWORD) {
    await authenticate(
      page,
      process.env.TEST_BCEID_USERNAME ?? '',
      process.env.TEST_BCEID_PASSWORD ?? '',
      'bceid',
    );
  }

  // IMPORTANT: After auth, make sure we're back on localhost
  // and wait for any final redirects to complete
  console.log('Ensuring we are on the correct domain...');
  const currentUrl = page.url();
  if (!currentUrl.includes(baseURL)) {
    console.log(`Navigating back to ${baseURL}/search...`);
    await page.goto(`${baseURL}/search`);
    await page.waitForLoadState('networkidle');
  }

  // Verify authentication worked before saving
  const searchTitle = await page
    .getByRole('heading', { name: 'Waste search' })
    .isVisible()
    .catch(() => false);

  if (!searchTitle) {
    throw new Error('Authentication verification failed: Search page title not found');
  }

  console.log('Authentication verified, saving storage state...');
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
