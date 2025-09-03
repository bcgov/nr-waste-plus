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
    device: devices['Desktop Chrome'],
    storageState: './src/config/tests/user.chromium.json',
  },
  {
    name: 'firefox',
    device: devices['Desktop Firefox'],
    storageState: './src/config/tests/user.firefox.json',
  },
  {
    name: 'webkit',
    device: devices['Desktop Safari'],
    storageState: './src/config/tests/user.webkit.json',
  },
];

// Filter based on ALL_BROWSERS env
const projects = (isAllBrowsers ? browserProjects : [browserProjects[0]!]).map(
  ({ name, device, storageState }) => ({
    name,
    use: {
      ...commonSettings,
      ...device,
      storageState,
    },
  }),
);

export default defineConfig({
  timeout: THIRTY_SECONDS,
  retries: process.env.CI ? 2 : 0,
  testMatch: '**/*.e2e.test.{ts,tsx}',
  testDir: './src',
  globalSetup: './src/config/tests/auth.setup.ts',
  globalTeardown: './src/config/tests/auth.teardown.ts',
  projects,
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
  },
});
