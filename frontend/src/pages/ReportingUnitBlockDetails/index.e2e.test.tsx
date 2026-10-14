import { expect, test } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApi, mockApiResponses } from '@/config/tests/e2e.helper';

// ── Constants ─────────────────────────────────────────────────────────────────

const RU_ID = 468;
const BLOCK_ID = 12;
const ROUTE_PATH = `/reporting-units/${RU_ID}/${BLOCK_ID}`;

/** Reporting-unit payload used by every happy-path test (includes createdAt). */
const reportingUnitPayload = {
  id: RU_ID,
  client: { code: '00002022', description: 'Canadian Forest Products Ltd.' },
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'IN', description: 'Interior' },
  sampling: { code: 'DA', description: 'District Average' },
  district: { code: 'DKM', description: 'Coast Mountains District' },
  createdAt: '2025-05-25',
};

/**
 * Block details payload — the page runs a dual query (RU + block) and only
 * renders the banner when both succeed, so every test expecting the banner
 * must mock `reporting-units/{ruId}/{blockId}` as well.
 */
const blockDetailsPayload = {
  id: BLOCK_ID,
  reportingUnitId: RU_ID,
  blockType: 'DISTRICT_AVERAGE',
  draft: true,
  plcDate: null,
  revision: 1,
  isLegacy: false,
};

test.describe('Reporting Unit Block Details', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
    await mockJwt(page, testInfo.project.metadata);
  });

  // The block details route is ADMIN-only, and the BCeID mock user carries only
  // client-scoped roles — every scenario below therefore runs on the IDIR project.
  test('renders title and read-only summary', async ({ page }) => {
    test.skip(
      test.info().project.metadata.userType === 'bceid',
      'This scenario is validated on IDIR to avoid BCeID role-rule redirects.',
    );

    await mockApiResponses(page, `reporting-units/${RU_ID}`, 200, 'application/json', {
      ...reportingUnitPayload,
    });
    await mockApiResponses(
      page,
      `reporting-units/${RU_ID}/${BLOCK_ID}`,
      200,
      'application/json',
      blockDetailsPayload,
    );
    await page.goto(ROUTE_PATH);
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { level: 1, name: `Block ID ${BLOCK_ID}` }),
    ).toBeVisible();
    await expect(page.getByText('View block details')).toBeVisible();

    await expect(page.getByTestId('block-details-summary')).toBeVisible();
    await expect(page.getByTestId('card-item-content-client-name')).toHaveText(
      'Canadian Forest Products Ltd.',
    );
    await expect(page.getByTestId('card-item-content-client-id')).toHaveText('00002022');
    await expect(page.getByTestId('card-item-content-district')).toHaveText(
      'DKM - Coast Mountains District',
    );
    await expect(page.getByTestId('card-item-content-grades')).toHaveText('Interior');
    await expect(page.getByTestId('card-item-content-sampling-option')).toHaveText(
      'DA - District Average',
    );
    await expect(page.getByTestId('card-item-content-created-on')).toHaveText('May 25, 2025');

    // No edit controls in the read-only design.
    await expect(page.getByRole('button', { name: /edit/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
  });

  test('renders breadcrumb with both crumbs clickable', async ({ page }) => {
    test.skip(
      test.info().project.metadata.userType === 'bceid',
      'This scenario is validated on IDIR to avoid BCeID role-rule redirects.',
    );

    await mockApiResponses(page, `reporting-units/${RU_ID}`, 200, 'application/json', {
      ...reportingUnitPayload,
    });
    await mockApiResponses(
      page,
      `reporting-units/${RU_ID}/${BLOCK_ID}`,
      200,
      'application/json',
      blockDetailsPayload,
    );
    await page.goto(ROUTE_PATH);
    await page.waitForLoadState('domcontentloaded');

    // Scope to the breadcrumb container to avoid matching side nav links.
    const breadcrumb = page.locator('.page-title-breadcrumb');
    await expect(breadcrumb.getByText(`Reporting unit ${RU_ID}`)).toBeVisible();
    await expect(breadcrumb.getByText(`Block ${BLOCK_ID}`)).toBeVisible();

    // D6: both crumbs are clickable. "Block {blockId}" points at this route,
    // so clicking it stays on the block details page.
    await breadcrumb.getByText(`Block ${BLOCK_ID}`).click();
    await expect(page).toHaveURL(new RegExp(`/reporting-units/${RU_ID}/${BLOCK_ID}$`));

    await breadcrumb.getByText(`Reporting unit ${RU_ID}`).click();
    await expect(page).toHaveURL(new RegExp(`/reporting-units/${RU_ID}$`));
  });

  test('moves focus to the page heading on mount', async ({ page }) => {
    test.skip(
      test.info().project.metadata.userType === 'bceid',
      'This scenario is validated on IDIR to avoid BCeID role-rule redirects.',
    );

    await mockApiResponses(page, `reporting-units/${RU_ID}`, 200, 'application/json', {
      ...reportingUnitPayload,
    });
    await mockApiResponses(
      page,
      `reporting-units/${RU_ID}/${BLOCK_ID}`,
      200,
      'application/json',
      blockDetailsPayload,
    );
    await page.goto(ROUTE_PATH);

    const heading = page.getByRole('heading', { level: 1, name: `Block ID ${BLOCK_ID}` });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(heading).toHaveAttribute('tabindex', '-1');
  });

  test('keeps the block page and flags the summary when only the RU query fails', async ({
    page,
  }) => {
    test.skip(
      test.info().project.metadata.userType === 'bceid',
      'This scenario is validated on IDIR to avoid BCeID role-rule redirects.',
    );

    // The block endpoint always answers 200, so the page must stay on the
    // block view: only the summary card degrades, never the not-found state.
    await mockApiResponses(
      page,
      `reporting-units/${RU_ID}/${BLOCK_ID}`,
      200,
      'application/json',
      blockDetailsPayload,
    );

    await mockApi(page, `reporting-units/${RU_ID}`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          status: 500,
          title: 'Internal Server Error',
          detail: 'An unexpected error occurred.',
        }),
      });
    });

    await page.goto(ROUTE_PATH);
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { level: 1, name: `Block ID ${BLOCK_ID}` }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reporting Unit Block not found' })).toHaveCount(
      0,
    );
    await expect(page.getByText('Reporting unit summary unavailable')).toBeVisible();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Internal Server Error');
  });

  test('shows the alert banner on failure and recovers after retry', async ({ page }) => {
    test.skip(
      test.info().project.metadata.userType === 'bceid',
      'This scenario is validated on IDIR to avoid BCeID role-rule redirects.',
    );

    // The block endpoint is the authority on block existence: it answers 500
    // once, so the not-found state and its alert render, then recovers on the
    // retry refetch. The RU endpoint stays healthy throughout.
    await mockApiResponses(page, `reporting-units/${RU_ID}`, 200, 'application/json', {
      ...reportingUnitPayload,
    });

    let attempts = 0;
    await mockApi(page, `reporting-units/${RU_ID}/${BLOCK_ID}`, async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            status: 500,
            title: 'Internal Server Error',
            detail: 'An unexpected error occurred.',
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(blockDetailsPayload),
      });
    });

    await page.goto(ROUTE_PATH);
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: 'Reporting Unit Block not found' }),
    ).toBeVisible();
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Internal Server Error');

    await page.getByTestId('rublock-retry').click();

    await expect(
      page.getByRole('heading', { level: 1, name: `Block ID ${BLOCK_ID}` }),
    ).toBeVisible();
    await expect(page.getByTestId('block-details-summary')).toBeVisible();
    expect(attempts).toBeGreaterThan(1);
  });
});
