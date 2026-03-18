import { expect, type Locator } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Waste Search - Advanced Search', () => {
  let advancedSearchButton: Locator;
  let filterTag: Locator;
  let closeAdvancedSearchButton: Locator;

  test.beforeEach(async ({ page }, testInfo) => {
    await setupWasteSearchMocks(page, testInfo.project.metadata.userType, {
      includeSearchRoutes: true,
    });
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Open the advanced search
    advancedSearchButton = page.getByTestId('advanced-search-button-most');
    await advancedSearchButton.click();
  });

  test.describe('Client single-select input (IDIR)', () => {
    const clientNumber = '00049597';
    let clientInput: Locator;

    test.beforeEach(async ({ page }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'bceid', 'Only runs for IDIR users');

      await mockApiResponsesWithStub(
        page,
        'forest-clients/byNameAcronymNumber**',
        'forest-clients/byNameAcronymNumber-pg0.json',
      );

      // Look up and select a Client
      clientInput = page.getByRole('combobox', { name: 'Client' });
      await clientInput.fill(clientNumber);

      // Select the client
      await page.getByRole('option', { name: clientNumber, exact: false }).click();

      const regex = new RegExp(clientNumber);
      await expect(clientInput).toHaveValue(regex);

      closeAdvancedSearchButton = page.getByRole('button', { name: 'Close' });
      await closeAdvancedSearchButton.click();

      // Verify tag appears
      filterTag = page.getByTestId(`dt-clientNumbers-${clientNumber}`);
      await expect(filterTag).toBeVisible();
    });

    test('should clear the Client input field', async () => {
      // Dismiss tag
      const dismissFilterTag = filterTag.getByRole('button', { name: 'Dismiss' });
      await dismissFilterTag.click();

      // Re-open the advanced search
      await advancedSearchButton.click();

      // Verify input got cleared
      await expect(clientInput).toHaveValue('');
    });

    test('should remove the filter tag', async ({ page }) => {
      // Re-open the advanced search
      await advancedSearchButton.click();

      // Clear the Client input field
      const clientInputParent = page.locator('div').filter({ has: clientInput });
      const clearClientButton = clientInputParent.getByRole('button', {
        name: 'Clear selected item',
      });
      await clearClientButton.click();

      // Verify input got cleared
      await expect(clientInput).toHaveValue('');

      await closeAdvancedSearchButton.click();

      // Verify no tags remain
      await expect(filterTag).toHaveCount(0);
    });
  });

  test.describe('Client multi-select input (BCeID)', () => {
    const clientNumber1 = '90000001';
    const clientNumber2 = '90000003';
    let clientInput: Locator;
    let filterTag1: Locator;
    let filterTag2: Locator;
    let selectedCountDisplay: Locator;

    test.beforeEach(async ({ page }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'idir', 'Only runs for BCeID users');

      // Open up the Client combobox
      clientInput = page.getByRole('combobox', { name: 'Client' });
      await clientInput.click();

      // Select two clients
      await page.getByRole('option', { name: clientNumber1, exact: false }).click();
      await page.getByRole('option', { name: clientNumber2, exact: false }).click();

      selectedCountDisplay = page.locator('#as-client-multi-select .cds--tag__label');
      await expect(selectedCountDisplay).toHaveText('2');

      closeAdvancedSearchButton = page.getByRole('button', { name: 'Close' }).first();
      await closeAdvancedSearchButton.click();

      // Verify tags appear
      filterTag1 = page.getByTestId(`dt-clientNumbers-${clientNumber1}`);
      await expect(filterTag1).toBeVisible();
      filterTag2 = page.getByTestId(`dt-clientNumbers-${clientNumber2}`);
      await expect(filterTag2).toBeVisible();
    });

    test('should update the Client input field', async () => {
      // Dismiss first tag
      const dismissFilterTag1 = filterTag1.getByRole('button', { name: 'Dismiss' });
      await dismissFilterTag1.click();

      // Re-open the advanced search
      await advancedSearchButton.click();

      // Verify input got updated
      await expect(selectedCountDisplay).toHaveText('1');
    });

    test('should remove the first filter tag', async ({ page }) => {
      // Re-open the advanced search
      await advancedSearchButton.click();

      await clientInput.click();

      // Unselect the first client
      await page.getByRole('option', { name: clientNumber1, exact: false }).click();

      // Verify input got updated
      await expect(selectedCountDisplay).toHaveText('1');

      await closeAdvancedSearchButton.click();

      // Verify first tag was removed
      await expect(filterTag1).toHaveCount(0);

      // The other tag remains visible
      await expect(filterTag2).toBeVisible();
    });
  });

  test.describe('IDIR or BCeID', () => {
    let submitterInput: Locator;

    test.beforeEach(async ({ page }) => {
      const inputText = 'ZORO';

      await mockApiResponsesWithStub(
        page,
        'search/reporting-units-users**',
        'search/reporting-units-users-pg0.json',
      );

      // Look up and select a Submitter IDIR/BCeID
      submitterInput = page.getByTestId('submitter-name-ac');
      await submitterInput.fill(inputText);

      const userId = `BCEID\\${inputText}`;

      // Select the client
      await page.getByRole('option', { name: userId }).click();

      await expect(submitterInput).toHaveValue(userId);

      closeAdvancedSearchButton = page.getByRole('button', { name: 'Close' });
      await closeAdvancedSearchButton.click();

      // Verify tag appears
      filterTag = page.getByTestId(`dt-requestUserId-${userId}`);
      await expect(filterTag).toBeVisible();
    });

    test('should clear the IDIR or BCeID input field', async () => {
      // Dismiss tag
      const dismissFilterTag = filterTag.getByRole('button', { name: 'Dismiss' });
      await dismissFilterTag.click();

      // Re-open the advanced search
      await advancedSearchButton.click();

      // Verify input got cleared
      await expect(submitterInput).toHaveValue('');
    });

    test('should remove the filter tag', async ({ page }) => {
      // Re-open the advanced search
      await advancedSearchButton.click();

      // Clear the IDIR or BCeID input field
      const submitterInputParent = page.locator('div').filter({ has: submitterInput });
      const clearSubmitterButton = submitterInputParent.getByRole('button', {
        name: 'Clear selected item',
      });
      await clearSubmitterButton.click();

      // Verify input got cleared
      await expect(submitterInput).toHaveValue('');

      await closeAdvancedSearchButton.click();

      // Verify no tags remain
      await expect(filterTag).toHaveCount(0);
    });
  });
});
