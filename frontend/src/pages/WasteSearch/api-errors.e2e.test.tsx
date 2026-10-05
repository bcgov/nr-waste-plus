import { expect } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';
import { mockApiResponses } from '@/config/tests/e2e.helper';

test.describe('Waste Search - API Errors', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupWasteSearchMocks(page, testInfo.project.metadata.userType, {
      includeSearchRoutes: true,
    });
    await page.goto('/search');
  });

  test('API is unavailable', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('fivehundred');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

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

    const errorNotification = page.locator('[role="alert"]');
    await expect(errorNotification).toBeVisible();
  });

  test('inline error notification shows ProblemDetails title and description', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('fivehundred');
    await searchBox.blur();

    await page.getByTestId('search-button-most').click();

    const notification = page.locator('[role="alert"]');
    await expect(notification).toBeVisible();

    // Title from ProblemDetails
    await expect(notification.getByText('Internal Server Error')).toBeVisible();

    // Detail from ProblemDetails
    await expect(
      notification.getByText(
        'Our droids have encountered an internal error while trying to process your request.',
      ),
    ).toBeVisible();
  });

  test('inline error notification can be dismissed', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('fivehundred');
    await searchBox.blur();

    await page.getByTestId('search-button-most').click();

    const notification = page.locator('[role="alert"]');
    await expect(notification).toBeVisible();

    // Carbon InlineNotification close button
    await notification.getByRole('button').click();

    await expect(notification).not.toBeVisible();
  });

  test('successful retry clears the previous error notification', async ({ page }) => {
    // Trigger an error first
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('fivehundred');
    await searchBox.blur();

    await page.getByTestId('search-button-most').click();

    await expect(page.locator('[role="alert"]')).toBeVisible();

    // Now run a successful search — the provider clears scoped notifications before fetching
    await searchBox.fill('67890');
    await searchBox.blur();

    await page.getByTestId('search-button-most').click();

    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  for (const [status, title, detail] of [
    [401, 'Unauthorized', 'The access token is invalid or has expired.'],
    [403, 'Forbidden', 'You do not have permission to access this resource.'],
  ] as const) {
    test(`TEST-004 shows an authenticated API ${status} notification`, async ({ page }) => {
      await mockApiResponses(
        page,
        'search/reporting-units?mainSearchTerm=auth-negative&size=10',
        status,
        'application/problem+json',
        {
          detail,
          instance: '/api/search/reporting-units',
          status,
          title,
        },
      );

      await page.getByRole('searchbox').fill('auth-negative');
      await page.getByTestId('search-button-most').click();

      const notification = page.locator('[role="alert"]');
      await expect(notification).toBeVisible();
      await expect(notification.getByText(title)).toBeVisible();
      await expect(notification.getByText(detail)).toBeVisible();
      await expect(page).toHaveURL(/\/search$/);
    });
  }
});
