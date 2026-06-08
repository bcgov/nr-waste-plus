import { expect } from '@playwright/test';

import { mockCreateRuConflict, mockCreateRuServerError, setupCreateRuMocks } from './e2e.setup';
import { fillFormAndSubmit } from './e2e.utils';

import { test } from '@/config/tests/coverage.setup';

test.describe('Create Reporting Unit - API Errors', () => {
  test.describe('server error (500)', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await setupCreateRuMocks(page, testInfo.project.metadata.userType);
      await mockCreateRuServerError(page);
      await page.goto('/reporting-units/create');
    });

    test('shows an inline error notification when the API returns 500', async ({
      page,
    }, testInfo) => {
      await fillFormAndSubmit(page, testInfo.project.metadata.userType);

      const notification = page.locator('[role="alert"]');
      await expect(notification).toBeVisible();
    });

    test('does NOT navigate away from the form after a 500 error', async ({ page }, testInfo) => {
      await fillFormAndSubmit(page, testInfo.project.metadata.userType);

      await expect(page).toHaveURL(/\/reporting-units\/create$/);
    });
  });

  test.describe('conflict error (409)', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await setupCreateRuMocks(page, testInfo.project.metadata.userType);
      await mockCreateRuConflict(page);
      await page.goto('/reporting-units/create');
    });

    test('shows an inline error notification when the API returns 409', async ({
      page,
    }, testInfo) => {
      await fillFormAndSubmit(page, testInfo.project.metadata.userType);

      const notification = page.locator('[role="alert"]');
      await expect(notification).toBeVisible();
    });

    test('does NOT navigate away from the form after a 409 conflict', async ({
      page,
    }, testInfo) => {
      await fillFormAndSubmit(page, testInfo.project.metadata.userType);

      await expect(page).toHaveURL(/\/reporting-units\/create$/);
    });
  });
});
