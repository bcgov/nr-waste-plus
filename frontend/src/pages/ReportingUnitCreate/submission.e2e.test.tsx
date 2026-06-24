import { expect } from '@playwright/test';

import { mockCreateRuSuccess, setupCreateRuMocks } from './e2e.setup';
import { blurActiveElement, selectClient, selectComboBoxOption } from './e2e.utils';

import { test } from '@/config/tests/coverage.setup';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Create Reporting Unit - Form Submission', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupCreateRuMocks(page, testInfo.project.metadata.userType);
    await mockCreateRuSuccess(page);
    await page.goto('/reporting-units/create');
  });

  test.describe('successful submission - non-DKM district', () => {
    test('submits the form and navigates to the created reporting unit', async ({
      page,
    }, testInfo) => {
      // Select district (non-DKM)
      await selectComboBoxOption(page, 'District', 'Cariboo-Chilcotin');

      // Sampling is pre-filled with AVG (District Average); select a different option to verify selection works
      await selectComboBoxOption(page, 'Sampling option', 'Ocular');

      // Select client
      await selectClient(page, testInfo.project.metadata.userType);

      // Blur any active element to let TanStack Form validators settle
      // (avoids a race where combobox blur → onBlurAsync → isValidating →
      // canSubmit=false silently aborts the click handler).
      await blurActiveElement(page);

      // Wait for the submit button to be enabled (all field validators passed).
      const submitButton = page.getByRole('button', { name: 'Create' });
      await expect(submitButton).toBeEnabled({ timeout: 5000 });

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

      // Select DKM district (Coast Mountains)
      await selectComboBoxOption(page, 'District', 'Coast Mountains');

      // Grade radio group should now be visible
      const gradeGroup = page.locator('#create-ru-grade');
      await expect(gradeGroup).toBeVisible();

      // Select "Coastal grades" with force: true to bypass pointer interception
      await page.getByRole('radio', { name: 'Coastal grades' }).click({ force: true });
      await expect(page.getByRole('radio', { name: 'Coastal grades' })).toBeChecked();

      // Select sampling option
      await selectComboBoxOption(page, 'Sampling option', 'Aggregate');

      // Blur active element to let validators settle
      await blurActiveElement(page);

      // Wait for the submit button to be enabled (all field validators passed).
      const submitButton = page.getByRole('button', { name: 'Create' });
      await expect(submitButton).toBeEnabled({ timeout: 5000 });

      await submitButton.click();

      // Wait for navigation to the new reporting unit's details page
      await page.waitForURL('**/reporting-units/99901');
      await expect(page).toHaveURL(/\/reporting-units\/99901$/);
    });

    test('shows grade field when DKM selected and allows Interior grades selection', async ({
      page,
    }, testInfo) => {
      test.slow(); // more steps than other tests — triple timeout for CI
      await selectClient(page, testInfo.project.metadata.userType);

      // Select DKM district (Coast Mountains)
      await selectComboBoxOption(page, 'District', 'Coast Mountains');

      // Select "Interior grades" with force: true
      await page.getByRole('radio', { name: 'Interior grades' }).click({ force: true });
      await expect(page.getByRole('radio', { name: 'Interior grades' })).toBeChecked();
      await expect(page.getByRole('radio', { name: 'Coastal grades' })).not.toBeChecked();

      // Select sampling option
      await selectComboBoxOption(page, 'Sampling option', 'Cutblock');

      // Blur active element to let validators settle
      await blurActiveElement(page);

      // Wait for the submit button to be enabled (all field validators passed).
      const submitButton = page.getByRole('button', { name: 'Create' });
      await expect(submitButton).toBeEnabled({ timeout: 5000 });

      await submitButton.click();

      await page.waitForURL('**/reporting-units/99901');
      await expect(page).toHaveURL(/\/reporting-units\/99901$/);
    });
  });
});
