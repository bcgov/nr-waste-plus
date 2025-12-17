import { test, expect } from '@playwright/test';

import { mockApiResponses, mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Theme toggle', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await mockApiResponses(page, 'users/preferences', 200, 'application/json', { theme: 'g10' });

    if (testInfo.project.metadata.userType === 'bceid') {
      await mockApiResponsesWithStub(
        page,
        'forest-clients/searchByNumbers**',
        'forest-clients/searchByNumbers-pg0.json',
      );
      await mockApiResponsesWithStub(
        page,
        'forest-clients/clients**',
        'forest-clients/clients-pg0.json',
      );
    }

    await mockApiResponsesWithStub(page, 'codes/districts', 'codes/districts.json');

    await mockApiResponsesWithStub(page, 'codes/samplings', 'codes/samplings.json');

    await mockApiResponsesWithStub(
      page,
      'codes/assess-area-statuses',
      'codes/assess-area-statuses.json',
    );

    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test('defaults to light theme and toggles to dark theme', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.metadata.userType === 'idir',
      'Running only for BCeID users for simplicity',
    );

    const themeToggler = page.getByRole('button', { name: 'Switch to dark mode' });
    await expect(themeToggler).toBeVisible();

    await mockApiResponses(page, 'users/preferences', 200, 'application/json', { theme: 'g100' });

    await themeToggler.click();

    await page.waitForResponse(
      (response) => response.url().includes('users/preferences') && response.status() === 200,
    );

    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  });
});
