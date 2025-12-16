import { test, expect } from '@playwright/test';

import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
test.beforeAll(async ({ browserName }, testInfo) => {
  test.skip(
    testInfo.project.metadata.userType === 'idir',
    'This page is only valid for BCeID users',
  );
});

test.describe('My Client List Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiResponsesWithStub(page, 'users/preferences', `users/preferences-GET.json`);

    await mockApiResponsesWithStub(
      page,
      'forest-clients/clients?page=0&size=10&value=',
      'forest-clients/clients-pg0.json',
    );

    await mockApiResponsesWithStub(
      page,
      'forest-clients/clients?page=0&size=10&value=OAK',
      'forest-clients/clients-OAK-pg0.json',
    );

    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
  });

  test('should display the My Client List page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'My clients' })).toBeVisible();
  });

  test('should display clients in the list', async ({ page }) => {
    await expect(page.getByRole('link', { name: '90000001' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' }).first()).toBeVisible();
  });

  test('should navigate to client details page when a client is clicked', async ({
    page,
    context,
  }) => {
    const clientLink = page.getByRole('link', { name: '90000001' }).first();

    const [newPage] = await Promise.all([context.waitForEvent('page'), await clientLink.click()]);

    await newPage.waitForLoadState();

    await expect(
      newPage.getByRole('heading', { name: 'Forests Client Management System' }),
    ).toBeVisible();
  });

  test('should allow column selection', async ({ page }) => {
    // This column is visible / exists in the default columns
    await expect(page.getByRole('columnheader', { name: 'Client Name' })).toBeVisible();

    const columnSelector = page.getByRole('button', { name: 'Edit columns' });
    await columnSelector.click();

    const addressOption = page.locator('#overflow-menu-1__menu-body').getByText('Client Name');
    await addressOption.click();

    // This column is visible / exists in the default columns
    await expect(page.getByRole('columnheader', { name: 'Client Name' })).not.toBeVisible();
  });

  test('filter OAK HERITAGE LTD.', async ({ page }) => {
    await expect(page.getByRole('link', { name: '90000001' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' }).first()).toBeVisible();

    const searchBox = page.getByTestId('main-search');;
    await searchBox.fill('OAK');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-other');
    await searchButton.click();


    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: '90000003' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'OAK HERITAGE LTD.' }).first()).toBeVisible();

    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' })).not.toBeVisible();
  });

  test('filter OAK HERITAGE LTD. with enter', async ({ page }) => {
    await expect(page.getByRole('link', { name: '90000001' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' }).first()).toBeVisible();

    const searchBox = page.getByTestId('main-search');;
    await searchBox.fill('OAK');
    await searchBox.press('Enter');

    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: '90000003' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'OAK HERITAGE LTD.' }).first()).toBeVisible();

    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' })).not.toBeVisible();
  });
});
