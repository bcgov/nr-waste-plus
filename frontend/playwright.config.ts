import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

import { THIRTY_SECONDS } from './src/config/react-query/TimeUnits';

dotenv.config();

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

const commonSettings = {
  headless: true,
  baseURL,
  viewport: { width: 1920, height: 1080 },
  ignoreHTTPSErrors: true,
  video: 'on-first-retry',
  trace: 'on-first-retry',
};

const shouldMockAuthentication = process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

const userPoolsClientId = process.env.VITE_USER_POOLS_WEB_CLIENT_ID;

const setupProjects = [
  {
    name: 'bceid-setup',
    use: {
      ...commonSettings,
      device: devices['Desktop Chrome'],
      storageState: 'src/config/tests/user.bceid.json',
    },
    testMatch: '**/auth.setup.ts',
    metadata: {
      userType: 'bceid',
      category: 'desktop',
      browserName: 'chromium',
      stateFile: 'user.bceid.json',
      shouldMockAuthentication,
      userPoolsClientId,
      user: process.env.BCEID_USERNAME ?? '',
      password: process.env.BCEID_PASSWORD ?? '',
    },
  },
  {
    name: 'idir-setup',
    use: {
      ...commonSettings,
      device: devices['Desktop Chrome'],
      storageState: 'src/config/tests/user.idir.json',
    },
    testMatch: '**/auth.setup.ts',
    metadata: {
      userType: 'idir',
      category: 'desktop',
      browserName: 'chromium',
      stateFile: 'user.idir.json',
      shouldMockAuthentication,
      userPoolsClientId,
      user: process.env.IDIR_USERNAME ?? '',
      password: process.env.IDIR_PASSWORD ?? '',
    },
  },
];

const chromiumBrowserProjects = [
  {
    name: 'bceid-chromium',
    use: {
      ...commonSettings,
      device: devices['Desktop Chrome'],
      storageState: 'src/config/tests/user.bceid.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'bceid',
      category: 'desktop',
      browserName: 'chromium',
      stateFile: 'user.bceid.json',
      userPoolsClientId,
    },
    dependencies: ['bceid-setup'],
  },
  {
    name: 'idir-chromium',
    use: {
      ...commonSettings,
      device: devices['Desktop Chrome'],
      storageState: 'src/config/tests/user.idir.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'idir',
      category: 'desktop',
      browserName: 'chromium',
      stateFile: 'user.idir.json',
      userPoolsClientId,
    },
    dependencies: ['idir-setup'],
  },
];

const projects = [...setupProjects, ...chromiumBrowserProjects];

export default defineConfig({
  timeout: THIRTY_SECONDS,
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  testDir: './src',
  globalTeardown: './src/config/tests/browser.teardown.ts',
  projects,
  webServer: {
    command: 'npm run build && npm run serve:e2e',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-reports/report', open: 'never' }],
    ['junit', { outputFile: 'test-reports/junit/report.xml' }],
  ],
});
