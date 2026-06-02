import { expect } from '@playwright/test';

import { mockCreateRuSuccess, setupCreateRuMocks } from './e2e.setup';

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
  optionName: string
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
 * Selects a client from the client input based on the user type.
 * - BCeID users: opens the ActiveMultiSelect and clicks an option.
 * - IDIR users: fills the autocomplete and waits for options to appear.
 */
async function selectClient(page: import('@playwright/test').Page, userType: string) {
  if (userType === 'bceid') {
    const clientInput = page.getByRole('combobox', { name: 'Client' });
    await clientInput.click();
    await page.getByRole('option', { name: '90000001', exact: false }).click();
  } else {
    // IDIR: autocomplete input
    const clientInput = page.locator('#as-forestclient-client-ac');
    await clientInput.fill('ZORO');
    await page.getByRole('option', { name: 'RORONOA ZORO SAWMILLS', exact: false }).click();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Create Reporting Unit - Form Submission', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupCreateRuMocks(page, testInfo.project.metadata.userType);
    await mockCreateRuSuccess(page);
    await page.goto('/reporting-units/create');
    await page.waitForLoadState('networkidle');
  });

  test.describe('successful submission - non-DKM district', () => {
    test('submits the form and navigates to the created reporting unit', async ({
      page,
    }, testInfo) => {
      // Select client
      await selectClient(page, testInfo.project.metadata.userType);

      // Select district (non-DKM) using keyboard navigation
      await selectComboBoxOption(page, 'create-ru-district', 'Cariboo-Chilcotin');

      // Select sampling option using keyboard navigation
      await selectComboBoxOption(page, 'as-sampling-multi-select', 'Ocular');

      // Wait a bit for form to settle
      await page.waitForTimeout(500);

      // Submit the form
      const submitButton = page.locator('.create-ru-submit-button');
      await submitButton.click();

      // Wait for navigation to the new reporting unit's details page
      await page.waitForURL('**/reporting-units/99901');
      await expect(page).toHaveURL(/\/reporting-units\/99901$/);
    });
  });

  test.describe('successful submission - DKM district with grade', () => {
    test('shows grade field when DKM is selected and submits with grade value', async ({
      page,
    }, testInfo) => {
      // Select client
      await selectClient(page, testInfo.project.metadata.userType);

      // Select DKM district (Coast Mountains) using keyboard navigation
      await selectComboBoxOption(page, 'create-ru-district', 'Coast Mountains');

      // Grade radio group should now be visible
      const gradeGroup = page.locator('#create-ru-grade');
      await expect(gradeGroup).toBeVisible();

      // Select "Coastal grades" with force: true to bypass pointer interception
      await page.getByRole('radio', { name: 'Coastal grades' }).click({ force: true });
      await expect(page.getByRole('radio', { name: 'Coastal grades' })).toBeChecked();

      // Select sampling option using keyboard navigation
      await selectComboBoxOption(page, 'as-sampling-multi-select', 'Aggregate');

      // Wait a bit for form to settle
      await page.waitForTimeout(500);

      // Submit the form
      const submitButton = page.locator('.create-ru-submit-button');
      await submitButton.click();

      // Wait for navigation to the new reporting unit's details page
      await page.waitForURL('**/reporting-units/99901');
      await expect(page).toHaveURL(/\/reporting-units\/99901$/);
    });

    test('shows grade field when DKM selected and allows Interior grades selection', async ({
      page,
    }, testInfo) => {
      await selectClient(page, testInfo.project.metadata.userType);

      // Select DKM district (Coast Mountains) using keyboard navigation
      await selectComboBoxOption(page, 'create-ru-district', 'Coast Mountains');

      // Select "Interior grades" with force: true
      await page.getByRole('radio', { name: 'Interior grades' }).click({ force: true });
      await expect(page.getByRole('radio', { name: 'Interior grades' })).toBeChecked();
      await expect(page.getByRole('radio', { name: 'Coastal grades' })).not.toBeChecked();

      // Select sampling option using keyboard navigation
      await selectComboBoxOption(page, 'as-sampling-multi-select', 'Cutblock');

      // Wait a bit for form to settle
      await page.waitForTimeout(500);

      // Submit the form
      const submitButton = page.locator('.create-ru-submit-button');
      await submitButton.click();

      await page.waitForURL('**/reporting-units/99901');
      await expect(page).toHaveURL(/\/reporting-units\/99901$/);
    });
  });
});
