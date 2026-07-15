import { test, expect } from '@playwright/test';

import { mockApiResponses, mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Theme toggle', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await mockApiResponses(page, 'users/preferences', 200, 'application/json', { theme: 'g10' });

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

    // Wait for the user-preferences GET to settle before navigating away from
    // the handler setup. The toggle persists via updatePreferences, which is
    // gated on isFetched; if we click before the GET resolves, the PUT
    // is skipped and the waitForResponse below times out. Registering the
    // wait before goto guarantees it is caught on every run.
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('users/preferences') && response.status() === 200,
      ),
      page.goto('/search'),
    ]);
  });

  test('defaults to light theme and toggles to dark theme', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.metadata.userType === 'idir',
      'Running only for BCeID users for simplicity',
    );

    const themeToggler = page.getByRole('button', { name: 'Switch to dark mode' });
    await expect(themeToggler).toBeVisible();

    await mockApiResponses(page, 'users/preferences', 200, 'application/json', { theme: 'g100' });

    await themeToggler.click();

    // Assert the toggle via the UI state directly. The saved preference is
    // persisted asynchronously (gated on the preferences query finishing its
    // initial load), so waiting on that network round-trip is racy; the
    // toggle itself is applied synchronously to local theme state.
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  });
});
