import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../cypress/.env' });

/**
 * Standalone real-SSO smoke check. It does not use Cucumber, the Cypress
 * plugin, or the mocked-auth setup projects in playwright.config.ts.
 */
export default defineConfig({
  testDir: './e2e-sso',
  timeout: 90_000,
  reporter: [['line'], ['list', { printSteps: true }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? process.env.CYPRESS_baseUrl ?? 'http://localhost:3000',
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  workers: 1,
  retries: 0,
});
