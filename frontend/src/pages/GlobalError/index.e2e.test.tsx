import { test, expect } from '@playwright/test';

import { mockApiResponses, mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Global Error Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET.json');

    if (testInfo.project.metadata.userType === 'bceid') {
      await mockApiResponsesWithStub(
        page,
        'forest-clients/searchByNumbers**',
        'forest-clients/searchByNumbers-pg0.json',
      );
      await mockApiResponsesWithStub(
        page,
        'forest-clients/clients**',
        'forest-clients/clients-pg0.json',
      );
    }

    await mockApiResponsesWithStub(page, 'codes/districts', 'codes/districts.json');
    await mockApiResponsesWithStub(page, 'codes/samplings', 'codes/samplings.json');
    await mockApiResponsesWithStub(
      page,
      'codes/assess-area-statuses',
      'codes/assess-area-statuses.json',
    );
  });

  test('shows the global error boundary when a route loader throws an unexpected error', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.metadata.userType === 'bceid',
      'This scenario is validated on IDIR to avoid BCeID role-rule redirects.',
    );

    // Inject the feature flag at runtime so the RU details route is enabled.
    // params.js loads with `defer` before the main bundle, so window.config is
    // set before env.ts evaluates featureFlags on page load.
    await page.route('**/data/params.js', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.config = { VITE_FEATURE_FLAGS: '{"reporting-unit-details-enabled":true}' };`,
      });
    });

    // Return a 500 for a specific RU. The loader re-throws any non-404/403 ApiError,
    // which bubbles up to TanStack Router's defaultErrorComponent (GlobalErrorPage).
    await mockApiResponses(page, 'reporting-units/99999', 500);

    await page.goto('/reporting-units/99999');

    await expect(page.getByText('Global Error')).toBeVisible();
    // Target the PageTitle subtitle specifically to avoid strict-mode violations
    // with the stack trace <pre> and toast notification that also contain this text.
    await expect(page.locator('.subtitle-section', { hasText: 'Internal Server Error' })).toBeVisible();
  });
});
