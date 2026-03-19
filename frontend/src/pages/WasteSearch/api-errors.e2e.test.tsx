import { expect } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';

test.describe('Waste Search - API Errors', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupWasteSearchMocks(page, testInfo.project.metadata.userType, {
      includeSearchRoutes: true,
    });
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test('API is unavailable', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('fivehundred');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    const errorNotification = page.locator('[role="alert"]');
    await expect(errorNotification).toBeVisible();
    await expect(
      page.getByText(
        'Our droids have encountered an internal error while trying to process your request.',
      ),
    ).toBeVisible();
  });

  test('API timeout', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('outoftime');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    const errorNotification = page.locator('[role="alert"]');
    await expect(errorNotification).toBeVisible();
  });
});
