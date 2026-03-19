import { expect } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';

test.describe('Waste Search - Search Results', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupWasteSearchMocks(page, testInfo.project.metadata.userType, {
      includeSearchRoutes: true,
    });
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test('should display search results in table', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('12345');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    // Verify mocked data appears
    await expect(page.getByText('90000001')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' })).toBeVisible();
  });

  test('should allow pagination of results', async ({ page }, testInfo) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('67890');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    // Verify mocked data appears

    if (testInfo.project.metadata.userType === 'bceid') {
      await expect(page.getByRole('cell', { name: '91234567' }).first()).toBeVisible();
    } else {
      await expect(page.getByRole('link', { name: '92345678' }).first()).toBeVisible();
    }
    await expect(page.getByRole('cell', { name: 'NORTHERN TIMBER CO' }).first()).toBeVisible();

    const resultSize = page.getByText('-10 of 12 items');
    await expect(resultSize).toBeVisible();

    // Check pagination controls are visible
    const pagination = page.locator(
      '.cds--popover-container.cds--popover--caret.cds--popover--high-contrast.cds--popover--top-end > .cds--tooltip-trigger__wrapper',
    );
    await expect(pagination).toBeVisible();
    await pagination.click();

    await page.waitForLoadState('networkidle');
    if (testInfo.project.metadata.userType === 'bceid') {
      await expect(page.getByRole('cell', { name: '92345678' })).toBeVisible();
    } else {
      await expect(page.getByRole('link', { name: '92345678' }).first()).toBeVisible();
    }
    await expect(page.getByRole('cell', { name: 'PACIFIC LOGGING LTD' }).first()).toBeVisible();
  });

  test('should display no results message', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('NONEXISTENT');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    await expect(page.getByText('No results')).toBeVisible();
  });

  test('primary and secondary are here', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('67890');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    // Verify mocked data appears
    await expect(page.getByRole('columnheader', { name: 'Multi-mark (Y/N)' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Secondary entry (Y/N)' })).toBeVisible();

    await expect(page.locator('tr:nth-child(17) > td:nth-child(7) > span')).toHaveText('No');
    await expect(page.locator('tr:nth-child(17) > td:nth-child(8) > span')).toHaveText('Yes');

    await expect(page.locator('tr:nth-child(19) > td:nth-child(7) > span')).toHaveText('Yes');
    await expect(page.locator('tr:nth-child(19) > td:nth-child(8) > span')).toHaveText('No');
  });

  test('enable timestamp column', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('67890');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Edit columns' }).click();

    const timestampColumnHeader = page
      .locator('button')
      .filter({ hasText: 'TimestampSort by ascending' });
    await expect(timestampColumnHeader).not.toBeVisible();

    await page.locator('label').filter({ hasText: 'Timestamp' }).click();
    await page.getByRole('button', { name: 'Edit columns' }).click();
    await expect(timestampColumnHeader).toBeVisible();
  });
});
