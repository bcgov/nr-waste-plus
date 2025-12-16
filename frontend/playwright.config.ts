import { defineConfig, devices, type VideoMode } from '@playwright/test';
import * as dotenv from 'dotenv';

import { THIRTY_SECONDS } from './src/config/react-query/TimeUnits';

dotenv.config();

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

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
    },
    dependencies: ['idir-setup'],
  },
];

const browserProjects = [
  {
    name: 'bceid-firefox',
    use: {
      ...commonSettings,
      device: devices['Desktop Firefox'],
      storageState: 'src/config/tests/user.bceid.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'bceid',
      category: 'desktop',
      browserName: 'firefox',
      stateFile: 'user.bceid.json',
    },
    dependencies: ['bceid-setup'],
  },
  {
    name: 'bceid-webkit',
    use: {
      ...commonSettings,
      device: devices['Desktop Safari'],
      storageState: 'src/config/tests/user.bceid.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'bceid',
      category: 'desktop',
      browserName: 'webkit',
      stateFile: 'user.bceid.json',
    },
    dependencies: ['bceid-setup'],
  },
  {
    name: 'idir-firefox',
    use: {
      ...commonSettings,
      device: devices['Desktop Firefox'],
      storageState: 'src/config/tests/user.idir.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'idir',
      category: 'desktop',
      browserName: 'firefox',
      stateFile: 'user.idir.json',
    },
    dependencies: ['idir-setup'],
  },
  {
    name: 'idir-webkit',
    use: {
      ...commonSettings,
      device: devices['Desktop Safari'],
      storageState: 'src/config/tests/user.idir.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'idir',
      category: 'desktop',
      browserName: 'webkit',
      stateFile: 'user.idir.json',
    },
    dependencies: ['idir-setup'],
  },
];

const mobileProjects = [
  {
    name: 'idir-android',
    use: {
      ...commonSettings,
      ...devices['Pixel 7'],
      device: devices['Pixel 7'],
      storageState: 'src/config/tests/user.idir.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'idir',
      category: 'android',
      browserName: 'chromium',
      stateFile: 'user.idir.json',
    },
    dependencies: ['idir-setup'],
  },
  {
    name: 'idir-iphone',
    use: {
      ...commonSettings,
      ...devices['iPhone 12'],
      device: devices['iPhone 12'],
      storageState: 'src/config/tests/user.idir.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'idir',
      category: 'iphone',
      browserName: 'webkit',
      stateFile: 'user.idir.json',
    },
    dependencies: ['idir-setup'],
  },
  {
    name: 'idir-ipad',
    use: {
      ...commonSettings,
      ...devices['iPad Pro 11 landscape'],
      device: devices['iPad Pro 11 landscape'],
      storageState: 'src/config/tests/user.idir.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'idir',
      category: 'ipad',
      browserName: 'webkit',
      stateFile: 'user.idir.json',
    },
    dependencies: ['idir-setup'],
  },
  {
    name: 'idir-tablet',
    use: {
      ...commonSettings,
      ...devices['Galaxy Tab S9 landscape'],
      device: devices['Galaxy Tab S9 landscape'],
      storageState: 'src/config/tests/user.idir.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'idir',
      category: 'tablet',
      browserName: 'chromium',
      stateFile: 'user.idir.json',
    },
    dependencies: ['idir-setup'],
  },
  {
    name: 'bceid-android',
    use: {
      ...commonSettings,
      ...devices['Pixel 7'],
      device: devices['Pixel 7'],
      storageState: 'src/config/tests/user.bceid.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'bceid',
      category: 'android',
      browserName: 'chromium',
      stateFile: 'user.bceid.json',
    },
    dependencies: ['bceid-setup'],
  },
  {
    name: 'bceid-iphone',
    use: {
      ...commonSettings,
      ...devices['iPhone 12'],
      device: devices['iPhone 12'],
      storageState: 'src/config/tests/user.bceid.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'bceid',
      category: 'iphone',
      browserName: 'webkit',
      stateFile: 'user.bceid.json',
    },
    dependencies: ['bceid-setup'],
  },
  {
    name: 'bceid-ipad',
    use: {
      ...commonSettings,
      ...devices['iPad Pro 11 landscape'],
      device: devices['iPad Pro 11 landscape'],
      storageState: 'src/config/tests/user.bceid.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'bceid',
      category: 'ipad',
      browserName: 'webkit',
      stateFile: 'user.bceid.json',
    },
    dependencies: ['bceid-setup'],
  },
  {
    name: 'bceid-tablet',
    use: {
      ...commonSettings,
      ...devices['Galaxy Tab S9 landscape'],
      device: devices['Galaxy Tab S9 landscape'],
      storageState: 'src/config/tests/user.bceid.json',
    },
    testMatch: '**/*.e2e.test.{ts,tsx}',
    metadata: {
      userType: 'bceid',
      category: 'tablet',
      browserName: 'chromium',
      stateFile: 'user.bceid.json',
    },
    dependencies: ['bceid-setup'],
  },
];

const a11yProject = [
  {
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
    dependencies: ['bceid-setup'],
  },
];

const projects = [...setupProjects, ...chromiumBrowserProjects];

if (process.env.RUN_MOBILE_TESTS === 'true') {
  projects.push(...mobileProjects);
}
if (process.env.RUN_BROWSERS_TESTS === 'true') {
  projects.push(...browserProjects);
}

if (process.env.RUN_A11Y_TESTS === 'true') {
  projects.push(...a11yProject);
}

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
