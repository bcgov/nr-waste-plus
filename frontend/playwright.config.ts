import { defineConfig, devices, type VideoMode } from '@playwright/test';
import * as dotenv from 'dotenv';

import { THIRTY_SECONDS } from './src/config/react-query/TimeUnits';

dotenv.config();

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const isAllBrowsers = process.env.ALL_BROWSERS === 'true';

const commonSettings = {
  headless: true,
  baseURL,
  viewport: { width: 1920, height: 1080 },
  ignoreHTTPSErrors: true,
  video: { mode: 'retain-on-failure' as VideoMode },
  contextOptions: {
    recordVideo: {
      dir: './test-results/videos',
    },
  },
};

const browserProjects = [
  {
    name: 'chromium',
    use: {
      ...commonSettings,
      device: devices['Desktop Chrome'],
      storageState: './src/config/tests/user.chromium.json',
    },
    testMatch: '**/*.browser.test.{ts,tsx}',
  },
  {
    name: 'firefox',
    use: {
      ...commonSettings,
      device: devices['Desktop Firefox'],
      storageState: './src/config/tests/user.firefox.json',
    },
    testMatch: '**/*.browser.test.{ts,tsx}',
  },
  {
    name: 'webkit',
    use: {
      ...commonSettings,
      device: devices['Desktop Safari'],
      storageState: './src/config/tests/user.webkit.json',
    },
    testMatch: '**/*.browser.test.{ts,tsx}',
  },
];

const a11yProject = {
  name: 'a11y-chromium',
  use: {
    ...commonSettings,
    device: devices['Desktop Chrome'],
    storageState: './src/config/tests/user.chromium.json',
  },
  testMatch: '**/*.a11y.test.{ts,tsx}',
};

// Filter based on ALL_BROWSERS env
const browserProjectsMapped = isAllBrowsers ? browserProjects : [browserProjects[0]!];

const projects = [...browserProjectsMapped, a11yProject];

export default defineConfig({
  timeout: THIRTY_SECONDS,
  retries: process.env.CI ? 2 : 0,
  testDir: './src',
  globalSetup: './src/config/tests/browser.setup.ts',
  globalTeardown: './src/config/tests/browser.teardown.ts',
  projects,
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-reports/report', open: 'never' }],
    ['junit', { outputFile: 'test-reports/junit/report.xml' }],
  ],
});
