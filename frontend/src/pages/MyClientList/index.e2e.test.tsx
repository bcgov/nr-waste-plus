import { test, expect } from '@playwright/test';

import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('My Client List Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiResponsesWithStub(page, 'users/preferences', `users/preferences-GET.json`);

    await mockApiResponsesWithStub(
      page,
      'forest-clients/searchByNumbers**',
      'forest-clients/searchByNumbers-pg0.json',
    );

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
  });

  test('should display the My Client List page @bceid-only', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'My clients' })).toBeVisible();
  });

  test('should display clients in the list @bceid-only', async ({ page }) => {
    await expect(page.getByRole('cell', { name: '90000001' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' }).first()).toBeVisible();
  });

  test('should render the client number as a link to search with client filter @bceid-only', async ({
    page,
  }) => {

    // The client number should be rendered as a link
    const clientLink = page.getByRole('link', { name: '90000001' });
    await expect(clientLink).toBeVisible();

    // The link should navigate to search page with client number filter
    await expect(clientLink).toHaveAttribute('href', '/search?clientNumbers=90000001');
  });

  test('should allow column selection @bceid-only', async ({ page }) => {
    // This column is visible / exists in the default columns
    await expect(page.getByRole('columnheader', { name: 'Client name' })).toBeVisible();

    const columnSelector = page.getByRole('button', { name: 'Edit columns' });
    await columnSelector.click();

    const addressOption = page.locator('#overflow-menu-1__menu-body').getByText('Client name');
    await addressOption.click();

    // This column is visible / exists in the default columns
    await expect(page.getByRole('columnheader', { name: 'Client name' })).not.toBeVisible();
  });

  test('filter OAK HERITAGE LTD. @bceid-only', async ({ page }) => {
    await expect(page.getByRole('cell', { name: '90000001' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' }).first()).toBeVisible();

    const searchBox = page.getByTestId('main-search');
    await searchBox.fill('OAK');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-other');
    await searchButton.click();


    await expect(page.getByRole('cell', { name: '90000003' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'OAK HERITAGE LTD.' }).first()).toBeVisible();

    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' })).not.toBeVisible();
  });

  test('filter OAK HERITAGE LTD. with enter @bceid-only', async ({ page }) => {
    await expect(page.getByRole('cell', { name: '90000001' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' }).first()).toBeVisible();

    const searchBox = page.getByTestId('main-search');
    await searchBox.fill('OAK');
    await searchBox.press('Enter');


    await expect(page.getByRole('cell', { name: '90000003' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'OAK HERITAGE LTD.' }).first()).toBeVisible();

    await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' })).not.toBeVisible();
  });

  test('should block My clients page for District/Area/Admin users @idir-only', async ({ page }) => {

    await expect(page).toHaveURL(/\/unauthorized/);
    await expect(page.getByText('Unauthorized Access')).toBeVisible();
  });

  test('IDIR user with Viewer role can access My clients page @idir-only', async ({ page }, testInfo) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'idir',
      'cognito:groups': ['WASTE_PLUS_VIEWER_00010005'],
    });

    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).not.toHaveURL(/\/unauthorized/);
    await expect(page.getByRole('heading', { name: 'My clients' })).toBeVisible();
  });

  test('IDIR user with Submitter role can access My clients page @idir-only', async ({ page }, testInfo) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'idir',
      'cognito:groups': ['WASTE_PLUS_SUBMITTER_00010005'],
    });

    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).not.toHaveURL(/\/unauthorized/);
    await expect(page.getByRole('heading', { name: 'My clients' })).toBeVisible();
  });

  test('should navigate to search page with selected client number in same tab @idir-only', async ({
    page,
  }, testInfo) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'idir',
      'cognito:groups': ['WASTE_PLUS_VIEWER_00010005'],
    });

    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');

    const clientLink = page.getByRole('link', { name: '90000001' });

    await expect(clientLink).toBeVisible();

    const href = await clientLink.getAttribute('href');
    expect(href).toContain('/search?clientNumbers=90000001');

    await clientLink.click();

    await expect(page).toHaveURL(/\/search\?clientNumbers=90000001/);
  });
});
