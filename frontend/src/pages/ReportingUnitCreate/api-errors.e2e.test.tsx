import { expect } from '@playwright/test';

import { mockCreateRuConflict, mockCreateRuServerError, setupCreateRuMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Selects an option from a Carbon ComboBox.
 */
async function selectComboBoxOption(
  page: import('@playwright/test').Page,
  comboBoxId: string,
  optionName: string,
) {
  const comboBox = page.locator(`#${comboBoxId}`);

  // Clear any existing value first
  await comboBox.fill('');
  await page.waitForTimeout(150);

  // Type slowly to avoid issues
  for (const char of optionName) {
    await comboBox.type(char, { delay: 20 });
  }
  await page.waitForTimeout(400);

  // Navigate and select
  await comboBox.press('ArrowDown');
  await page.waitForTimeout(150);
  await comboBox.press('Enter');
  await page.waitForTimeout(400);
}

/**
 * Fills in all required form fields with valid data and clicks the Create button.
 * Does NOT mock the POST endpoint — each test is responsible for that.
 */
async function fillFormAndSubmit(
  page: import('@playwright/test').Page,
  userType: string,
): Promise<void> {
  if (userType === 'bceid') {
    const clientInput = page.getByRole('combobox', { name: 'Client' });
    await clientInput.click();
    await page.getByRole('option', { name: '90000001', exact: false }).click();
  } else {
    const clientInput = page.locator('#as-forestclient-client-ac');
    await clientInput.fill('ZORO');
    await page.getByRole('option', { name: 'RORONOA ZORO SAWMILLS', exact: false }).click();
  }

  // Select district using keyboard navigation
  await selectComboBoxOption(page, 'create-ru-district', 'Cariboo-Chilcotin');

  // Select sampling using keyboard navigation
  await selectComboBoxOption(page, 'as-sampling-multi-select', 'Ocular');

  // Wait a bit for form to settle
  await page.waitForTimeout(500);

  const submitButton = page.locator('.create-ru-submit-button');
  await submitButton.click();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Create Reporting Unit - API Errors', () => {
  test.describe('server error (500)', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await setupCreateRuMocks(page, testInfo.project.metadata.userType);
      await mockCreateRuServerError(page);
      await page.goto('/reporting-units/create');
      await page.waitForLoadState('networkidle');
    });

    test('shows an inline error notification when the API returns 500', async ({
      page,
    }, testInfo) => {
      await fillFormAndSubmit(page, testInfo.project.metadata.userType);
      await page.waitForLoadState('networkidle');

      const notification = page.locator('[role="alert"]');
      await expect(notification).toBeVisible();
    });

    test('does NOT navigate away from the form after a 500 error', async ({ page }, testInfo) => {
      await fillFormAndSubmit(page, testInfo.project.metadata.userType);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/reporting-units\/create$/);
    });
  });

  test.describe('conflict error (409)', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await setupCreateRuMocks(page, testInfo.project.metadata.userType);
      await mockCreateRuConflict(page);
      await page.goto('/reporting-units/create');
      await page.waitForLoadState('networkidle');
    });

    test('shows an inline error notification when the API returns 409', async ({
      page,
    }, testInfo) => {
      await fillFormAndSubmit(page, testInfo.project.metadata.userType);
      await page.waitForLoadState('networkidle');

      const notification = page.locator('[role="alert"]');
      await expect(notification).toBeVisible();
    });

    test('does NOT navigate away from the form after a 409 conflict', async ({
      page,
    }, testInfo) => {
      await fillFormAndSubmit(page, testInfo.project.metadata.userType);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/reporting-units\/create$/);
    });
  });
});
