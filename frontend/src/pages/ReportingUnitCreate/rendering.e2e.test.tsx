import { expect } from '@playwright/test';

import { setupCreateRuMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';

test.describe('Create Reporting Unit - Rendering', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupCreateRuMocks(page, testInfo.project.metadata.userType);
    await page.goto('/reporting-units/create');
    await page.waitForLoadState('networkidle');
  });

  test.describe('page structure', () => {
    test('renders the page title', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'Create reporting unit', level: 1 }),
      ).toBeVisible();
    });

    test('renders the page subtitle', async ({ page }) => {
      await expect(
        page.getByText('Start a new waste submission by creating a reporting unit'),
      ).toBeVisible();
    });
  });

  test.describe('form fields', () => {
    test('renders the District combobox', async ({ page }) => {
      const district = page.locator('#create-ru-district');
      await expect(district).toBeVisible();
    });

    test('renders the Sampling option combobox', async ({ page }) => {
      const sampling = page.locator('#as-sampling-multi-select');
      await expect(sampling).toBeVisible();
    });

    test('renders the Create submit button', async ({ page }) => {
      const submitButton = page.locator('.create-ru-submit-button');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText('Create');
    });

    test('district combobox is populated with options', async ({ page }) => {
      const district = page.locator('#create-ru-district');
      await district.click();

      // Verify options from codes/districts.json are available
      await expect(page.getByRole('option', { name: 'Cariboo-Chilcotin' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Coast Mountains' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Fort Nelson' })).toBeVisible();
    });

    test('sampling combobox is populated with options', async ({ page }) => {
      const sampling = page.locator('#as-sampling-multi-select');
      await sampling.click();

      // Verify options from codes/samplings.json are available
      await expect(page.getByRole('option', { name: 'Aggregate' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'District Average' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Cutblock' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Ocular' })).toBeVisible();
    });

    test('grade radio buttons are NOT shown when district is not DKM', async ({ page }) => {
      const gradeGroup = page.locator('#create-ru-grade');
      await expect(gradeGroup).not.toBeVisible();
    });
  });

  test.describe('client input field - user type variant', () => {
    test('renders client input for BCeID users', async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.metadata.userType !== 'bceid',
        'BCeID-only: ActiveMultiSelect client input',
      );

      // BCeID users see a multi-select limited to their assigned clients
      const clientInput = page.locator('#as-client-multi-select');
      await expect(clientInput).toBeVisible();
    });

    test('renders client autocomplete for IDIR users', async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.metadata.userType !== 'idir',
        'IDIR-only: AutoComplete client input',
      );

      // IDIR users see a free-text autocomplete search box
      const clientInput = page.locator('#as-forestclient-client-ac');
      await expect(clientInput).toBeVisible();
    });
  });
});
