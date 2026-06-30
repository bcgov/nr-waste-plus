import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

import { THIRTY_SECONDS } from './src/config/react-query/TimeUnits';

dotenv.config();

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

const commonSettings = {
  headless: true,
  baseURL,
  // 1600×900: common 16:9 desktop resolution within the Carbon `max` breakpoint
  // (≥1584px). Smaller than 1920×1080 so Carbon renders the same layout but
  // with ~17% fewer pixels — faster frame production, same coverage.
  viewport: { width: 1600, height: 900 },
  ignoreHTTPSErrors: true,
  video: 'on-first-retry' as const,
  trace: 'on-first-retry' as const,
};

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
    grepInvert: /@idir-only/,
    metadata: {
      userType: 'bceid',
      category: 'desktop',
      browserName: 'chromium',
      stateFile: 'user.bceid.json',
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
    grepInvert: /@bceid-only/,
    metadata: {
      userType: 'idir',
      category: 'desktop',
      browserName: 'chromium',
      stateFile: 'user.idir.json',
    },
    dependencies: ['idir-setup'],
  },
];

const projects = [...setupProjects, ...chromiumBrowserProjects];

if (process.env.RUN_A11Y_TESTS === 'true') {
  projects.push({
    name: 'a11y-chromium',
    use: {
      ...commonSettings,
      device: devices['Desktop Chrome'],
      storageState: 'src/config/tests/user.bceid.json',
    },
    testMatch: '**/*.a11y.test.{ts,tsx}',
    metadata: {
      userType: 'bceid',
      category: 'desktop',
      browserName: 'chromium',
      stateFile: 'user.bceid.json',
    },
  });
}

export default defineConfig({
  timeout: THIRTY_SECONDS,
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  testDir: './src',
  globalTeardown: './src/config/tests/browser.teardown.ts',
  projects,
  webServer: {
    command: 'npm run serve:e2e:test',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { outputFolder: 'test-reports/report', open: 'never' }],
        ['junit', { outputFile: 'test-reports/junit/report.xml' }],
      ]
    : 'list',
});
