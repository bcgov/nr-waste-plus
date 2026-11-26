import { expect, test } from '@playwright/test';
import { injectAxe } from 'axe-playwright';

import { runA11yAudit } from '@/config/tests/a11y.helper';
import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponses } from '@/config/tests/e2e.helper';

// ── Constants ─────────────────────────────────────────────────────────────────

const RU_ID = 468;
const BLOCK_ID = 12;
const ROUTE_PATH = `/reporting-units/${RU_ID}/${BLOCK_ID}`;

/** Reporting-unit payload used by the a11y audit. */
const reportingUnitPayload = {
  id: RU_ID,
  client: { code: '00002022', description: 'Canadian Forest Products Ltd.' },
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'IN', description: 'Interior' },
  sampling: { code: 'DA', description: 'District Average' },
  district: { code: 'DKM', description: 'Coast Mountains District' },
};

/**
 * Block details payload — the page runs a dual query (RU + block) and only
 * renders the banner when both succeed, so the block endpoint must be mocked
 * alongside the reporting-unit one.
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

/**
 * Block details payload with supplied area and volume summaries, so the audit covers the
 * summary tables and the inline harvest-method dropdown rather than empty cards.
 */
const richBlockDetailsPayload = {
  ...blockDetailsPayload,
  wasteAssessmentAreaSummary: {
    primary: { timberMarkId: 'TM-100', netWasteAreaHa: 1.25 },
    secondary: [{ timberMarkId: 'TM-101', netWasteAreaHa: 0.5 }],
    totalNetWasteAreaHa: 1.75,
  },
  districtAverageVolumesSummary: {
    rows: [
      {
        populationType: 'Dispersed',
        wasteType: 'H– Historic waste information',
        harvestMethodCode: 'G',
        assessmentMethod: 'D - District average',
        wasteLevel: 'X - Not stratified',
        netWasteAreaHa: 1.25,
        totalBillableVolumeM3: 10.5,
        totalCutControlVolumeM3: 4.2,
      },
    ],
    totals: { totalBillableVolumeM3: 10.5, totalCutControlVolumeM3: 4.2 },
  },
};

test.describe('<ReportingUnitBlockDetailsPage />', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const idirMetadata = { ...testInfo.project.metadata, userType: 'idir' };
    await setupAppShellMocks(page, idirMetadata.userType);
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
    // The a11y workflow keeps the block details flag off (matching the other
    // reporting-unit flags there), so inject it at runtime: params.js loads
    // with `defer` before the main bundle, so window.config is set before
    // env.ts evaluates featureFlags on page load.
    await page.route('**/data/params.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.config = { VITE_FEATURE_FLAGS: '{"reporting-unit-block-details-enabled":true}' };`,
      }),
    );
    await mockJwt(page, idirMetadata);
    await page.goto(ROUTE_PATH, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    await injectAxe(page);
  });

  test('simple accessibility run', async ({ page }) => {
    // Assert the audited page is the block details page, not a redirect target.
    const heading = page.locator('h1', { hasText: `Block ID ${BLOCK_ID}` });
    await expect(heading).toBeVisible();
    await runA11yAudit(page, undefined);
  });

  test('check a11y for the whole page and axe run options', async ({ page }) => {
    // Assert the audited page is the block details page, not a redirect target.
    const heading = page.locator('h1', { hasText: `Block ID ${BLOCK_ID}` });
    await expect(heading).toBeVisible();
    await runA11yAudit(page, undefined);
  });

  test('audits the first tab with supplied area and volume summaries', async ({ page }) => {
    await mockApiResponses(
      page,
      `reporting-units/${RU_ID}/${BLOCK_ID}`,
      200,
      'application/json',
      richBlockDetailsPayload,
    );
    await page.reload({ waitUntil: 'networkidle' });
    await injectAxe(page);

    await expect(page.locator('h1', { hasText: `Block ID ${BLOCK_ID}` })).toBeVisible();
    await expect(
      page.getByRole('combobox', {
        name: 'Harvest method for Dispersed, H– Historic waste information',
      }),
    ).toBeVisible();
    await runA11yAudit(page, undefined);
  });

  test('audits the read-only first tab for a legacy block', async ({ page }) => {
    await mockApiResponses(page, `reporting-units/${RU_ID}/${BLOCK_ID}`, 200, 'application/json', {
      ...richBlockDetailsPayload,
      isLegacy: true,
    });
    await page.reload({ waitUntil: 'networkidle' });
    await injectAxe(page);

    await expect(page.locator('h1', { hasText: `Block ID ${BLOCK_ID}` })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'District average volumes summary' }),
    ).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Harvest method for/ })).toHaveCount(0);
    await runA11yAudit(page, undefined);
  });
});
