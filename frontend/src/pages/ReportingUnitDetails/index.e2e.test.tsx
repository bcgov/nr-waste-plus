import { expect } from '@playwright/test';

import { test } from '@/config/tests/coverage.setup';
import { mockApiResponses, mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mocks the common dependencies the ReportingUnitDetails page needs to render:
 * user preferences and the reporting unit API endpoint.
 *
 * @param page   Playwright page.
 * @param ruId   Reporting unit ID to load.
 * @param stub   Stub filename under stub/__files/reporting-units/ (without the directory prefix).
 */
async function setupMocks(
  page: Parameters<typeof mockApiResponsesWithStub>[0],
  ruId: number | string,
  stub: string,
) {
  await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET.json');
  await mockApiResponsesWithStub(page, `reporting-units/${ruId}`, `reporting-units/${stub}`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('ReportingUnitDetails Page', () => {
  test.describe('page structure', () => {
    test.beforeEach(async ({ page }) => {
      await setupMocks(page, 123, 'details-123.json');
      await page.goto('/reporting-units/123');
    });

    test('renders the page title with the reporting unit ID', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Reporting Unit no\.: 123/i })).toBeVisible();
    });

    test('renders the page subtitle', async ({ page }) => {
      await expect(
        page.getByText('Start a new waste submission by creating a reporting unit'),
      ).toBeVisible();
    });

    test('renders the UnderConstruction tag on every load', async ({ page }) => {
      await expect(page.getByText('Under construction')).toBeVisible();
    });
  });

  test.describe('tombstone – field values', () => {
    test.beforeEach(async ({ page }) => {
      await setupMocks(page, 123, 'details-123.json');
      await page.goto('/reporting-units/123');
    });

    test('renders the client name', async ({ page }) => {
      await expect(page.getByText('CANADIAN SAMPLE CO.')).toBeVisible();
    });

    test('renders the client number', async ({ page }) => {
      await expect(page.getByText('90000001')).toBeVisible();
    });

    test('renders the client status', async ({ page }) => {
      await expect(page.getByText('Active')).toBeVisible();
    });

    test('renders district code and description', async ({ page }) => {
      await expect(page.getByText('DCC - Cariboo-Chilcotin')).toBeVisible();
    });

    test('renders sampling code and description', async ({ page }) => {
      await expect(page.getByText('OCU - Ocular')).toBeVisible();
    });
  });

  test.describe('tombstone – field labels', () => {
    test.beforeEach(async ({ page }) => {
      await setupMocks(page, 123, 'details-123.json');
      await page.goto('/reporting-units/123');
    });

    test('renders "Client name" label', async ({ page }) => {
      await expect(page.getByText('Client name')).toBeVisible();
    });

    test('renders "Client number" label', async ({ page }) => {
      await expect(page.getByText('Client number')).toBeVisible();
    });

    test('renders "Client status" label', async ({ page }) => {
      await expect(page.getByText('Client status')).toBeVisible();
    });

    test('renders "District" label', async ({ page }) => {
      await expect(page.getByText('District', { exact: true })).toBeVisible();
    });

    test('renders "Grades" label', async ({ page }) => {
      await expect(page.getByText('Grades')).toBeVisible();
    });

    test('renders "Sampling option" label', async ({ page }) => {
      await expect(page.getByText('Sampling option')).toBeVisible();
    });
  });

  test.describe('LegacyDataTag – conditional rendering', () => {
    test('shows LegacyDataTag when grade code is null', async ({ page }) => {
      // details-123.json has grade.code = null
      await setupMocks(page, 123, 'details-123.json');
      await page.goto('/reporting-units/123');

      await expect(page.getByText('Legacy data')).toBeVisible();
    });

    test('hides LegacyDataTag when grade code is present', async ({ page }) => {
      // details-with-grade.json has grade.code = 'G1'
      await setupMocks(page, 456, 'details-with-grade.json');
      await page.goto('/reporting-units/456');

      await expect(page.getByText('Legacy data')).not.toBeVisible();
    });

    test('LegacyDataTag links to the legacy system with the correct reporting unit ID', async ({
      page,
    }) => {
      await setupMocks(page, 123, 'details-123.json');
      await page.goto('/reporting-units/123');

      const legacyLink = page.getByRole('link', { name: 'Legacy data' });
      await expect(legacyLink).toBeVisible();
      await expect(legacyLink).toHaveAttribute(
        'href',
        /waste101ReportUnitDetailsAction\.do\?dataBean\.p_reporting_unit_id=123/,
      );
    });
  });

  test.describe('client number link – role-gated', () => {
    test('IDIR users see the client number as a link', async ({ page }) => {
      test.skip(
        test.info().project.metadata.userType !== 'idir',
        'Client number link is only visible for IDIR users.',
      );

      await setupMocks(page, 123, 'details-123.json');
      await page.goto('/reporting-units/123');

      const clientLink = page.getByRole('link', { name: '90000001' });
      await expect(clientLink).toBeVisible();
      await expect(clientLink).toHaveAttribute('href', /\/clients\/details\/90000001/);
    });

    test('non-IDIR users do not see the client number as a link', async ({ page }) => {
      test.skip(
        test.info().project.metadata.userType === 'idir',
        'This test verifies behaviour for non-IDIR users.',
      );

      await setupMocks(page, 123, 'details-123.json');
      await page.goto('/reporting-units/123');

      // Client number text is still visible, but not wrapped in a link
      await expect(page.getByText('90000001')).toBeVisible();
      await expect(page.getByRole('link', { name: '90000001' })).not.toBeVisible();
    });
  });

  test.describe('different reporting unit data', () => {
    test('renders correctly for a different reporting unit', async ({ page }) => {
      await setupMocks(page, 321, 'details-321.json');
      await page.goto('/reporting-units/321');

      await expect(page.getByRole('heading', { name: /Reporting Unit no\.: 321/i })).toBeVisible();
      await expect(page.getByText('JOHN WICK LOGGING LTD.')).toBeVisible();
      await expect(page.getByText('90000002')).toBeVisible();
      await expect(page.getByText('DCC - Cariboo-Chilcotin')).toBeVisible();
      await expect(page.getByText('OCU - Ocular')).toBeVisible();
    });

    test('renders grade description when grade code is present', async ({ page }) => {
      await setupMocks(page, 456, 'details-with-grade.json');
      await page.goto('/reporting-units/456');

      await expect(page.getByText('Grade 1')).toBeVisible();
    });
  });

  test.describe('error states', () => {
    test('redirects to Not Found when the API returns 404', async ({ page }) => {
      await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET.json');
      await mockApiResponses(page, 'reporting-units/9999', 404, 'application/problem+json', {
        status: 404,
        title: 'Not Found',
        detail: 'Reporting unit not found.',
        instance: '/api/reporting-units/9999',
      });

      await page.goto('/reporting-units/9999');

      // TanStack Router renders a Not Found component on 404 throws from the loader
      await expect(page.getByText('Content Not Found')).toBeVisible();
    });
  });
});
