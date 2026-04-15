import { test, expect } from '@playwright/test';

import { mockApiResponses, mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const hasClientAccessRole = (userType: string) => userType === 'bceid';

/**
 * Mounts the page with the user-preferences and client-search-by-numbers stubs
 * that are required regardless of the clients endpoint outcome.
 */
const setupCommonMocks = async (page: Parameters<typeof mockApiResponsesWithStub>[0]) => {
  await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET.json');

  await mockApiResponsesWithStub(
    page,
    'forest-clients/searchByNumbers**',
    'forest-clients/searchByNumbers-pg0.json',
  );
};

// -----------------------------------------------------------------------------
// Tests
// Note: Toast notifications triggered by the PWA service worker lifecycle are
// not covered here because they require a real service worker activation context
// that is not reachable inside a Playwright browser session.
// -----------------------------------------------------------------------------

test.describe('My Client List - Inline Notifications', () => {
  test('shows inline error notification when the clients API returns 500', async ({
    page,
  }, testInfo) => {
    test.skip(
      !hasClientAccessRole(testInfo.project.metadata.userType),
      'Only runs for users with client access (BCeID)',
    );

    await setupCommonMocks(page);

    await mockApiResponses(page, 'forest-clients/clients**', 500, 'application/problem+json', {
      title: 'Internal Server Error',
      detail: 'Unable to retrieve client data at this time.',
      status: 500,
      type: 'about:blank',
    });

    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const notification = page.locator('[role="alert"]');
    await expect(notification).toBeVisible();
  });

  test('inline error notification shows the ProblemDetails title and description', async ({
    page,
  }, testInfo) => {
    test.skip(
      !hasClientAccessRole(testInfo.project.metadata.userType),
      'Only runs for users with client access (BCeID)',
    );

    await setupCommonMocks(page);

    await mockApiResponses(page, 'forest-clients/clients**', 500, 'application/problem+json', {
      title: 'Client Search Failed',
      detail: 'The client directory service is currently unavailable.',
      status: 500,
      type: 'about:blank',
    });

    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const notification = page.locator('[role="alert"]');
    await expect(notification).toBeVisible();

    await expect(notification.getByText('Client Search Failed')).toBeVisible();
    await expect(
      notification.getByText('The client directory service is currently unavailable.'),
    ).toBeVisible();
  });

  test('inline error notification falls back to a generic message when no detail is provided', async ({
    page,
  }, testInfo) => {
    test.skip(
      !hasClientAccessRole(testInfo.project.metadata.userType),
      'Only runs for users with client access (BCeID)',
    );

    await setupCommonMocks(page);

    await mockApiResponses(page, 'forest-clients/clients**', 500, 'application/problem+json', {
      title: 'Internal Server Error',
      status: 500,
      type: 'about:blank',
    });

    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const notification = page.locator('[role="alert"]');
    await expect(notification).toBeVisible();

    await expect(notification.getByText('No additional details provided.')).toBeVisible();
  });

  test('inline error notification can be dismissed via the close button', async ({
    page,
  }, testInfo) => {
    test.skip(
      !hasClientAccessRole(testInfo.project.metadata.userType),
      'Only runs for users with client access (BCeID)',
    );

    await setupCommonMocks(page);

    await mockApiResponses(page, 'forest-clients/clients**', 500, 'application/problem+json', {
      title: 'Client Search Failed',
      detail: 'The client directory service is currently unavailable.',
      status: 500,
      type: 'about:blank',
    });

    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const notification = page.locator('[role="alert"]');
    await expect(notification).toBeVisible();

    // Carbon InlineNotification close button
    await notification.getByRole('button').click();

    await expect(notification).not.toBeVisible();
  });

  test('new search clears the previous inline error notification', async ({ page }, testInfo) => {
    test.skip(
      !hasClientAccessRole(testInfo.project.metadata.userType),
      'Only runs for users with client access (BCeID)',
    );

    await setupCommonMocks(page);

    // First request returns a 500
    await mockApiResponses(page, 'forest-clients/clients**', 500, 'application/problem+json', {
      title: 'Client Search Failed',
      detail: 'The client directory service is currently unavailable.',
      status: 500,
      type: 'about:blank',
    });

    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[role="alert"]')).toBeVisible();

    // Override with a successful response and trigger a manual search
    await mockApiResponsesWithStub(
      page,
      'forest-clients/clients**',
      'forest-clients/clients-pg0.json',
    );

    const searchBox = page.getByTestId('main-search');
    await searchBox.fill('');
    await page.getByTestId('search-button-other').click();

    await page.waitForLoadState('networkidle');

    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });
});
