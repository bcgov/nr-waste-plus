import { expect } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';

// ---------------------------------------------------------------------------
// Redirect-after-login behaviour
// These tests verify that the app saves the user's intended deep-link URL to
// sessionStorage before the OAuth redirect and restores it once authenticated.
// ---------------------------------------------------------------------------
test.describe('Waste Search - Redirect After Login', () => {
  // -------------------------------------------------------------------------
  // Unauthenticated path: start without any stored auth state and visit a
  // protected URL.  The app should land on the Landing page and preserve the
  // intended destination in sessionStorage so login can pick it up.
  // -------------------------------------------------------------------------
  test.describe('when visiting a protected URL while not authenticated', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page }, testInfo) => {
      await setupWasteSearchMocks(page, testInfo.project.metadata.userType);
    });

    test('shows the Landing page and saves the intended URL to sessionStorage', async ({
      page,
    }) => {
      await page.goto('/search?district=DFN');
      await page.waitForLoadState('networkidle');

      // User must be shown the landing / login page, not the search page.
      await expect(page.getByTestId('landing-title')).toBeVisible();

      // The intended URL should be preserved for use after login.
      const savedUrl = await page.evaluate(() => sessionStorage.getItem('redirectAfterLogin'));
      expect(savedUrl).toBe('/search?district=DFN');
    });

    test('preserves the full querystring including multiple params', async ({ page }) => {
      await page.goto('/search?mainSearchTerm=TIMBER&district=DFN');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('landing-title')).toBeVisible();

      const savedUrl = await page.evaluate(() => sessionStorage.getItem('redirectAfterLogin'));
      expect(savedUrl).toBe('/search?mainSearchTerm=TIMBER&district=DFN');
    });

    test('does NOT save the root path to sessionStorage', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('landing-title')).toBeVisible();

      const savedUrl = await page.evaluate(() => sessionStorage.getItem('redirectAfterLogin'));
      expect(savedUrl).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated path: simulate a user returning from OAuth with a previously
  // saved redirect URL still in sessionStorage.  The app should navigate there
  // automatically and then clear the sessionStorage entry.
  // -------------------------------------------------------------------------
  test.describe('when authenticated and a redirect URL is stored in sessionStorage', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      await setupWasteSearchMocks(page, testInfo.project.metadata.userType);
    });

    test('navigates to the saved URL and clears sessionStorage after auth resolves', async ({
      page,
    }) => {
      const targetUrl = '/search?district=DFN';

      // Plant the intended URL in sessionStorage before the app boots, simulating
      // the value that was saved just before signInWithRedirect() was called.
      await page.addInitScript((url) => {
        sessionStorage.setItem('redirectAfterLogin', url);
      }, targetUrl);

      // Land on root (the typical OAuth callback destination).
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // The app should have redirected to the saved deep-link URL.
      await expect(page).toHaveURL(/district=DFN/);

      // sessionStorage must be cleared so the redirect only fires once.
      const savedUrl = await page.evaluate(() => sessionStorage.getItem('redirectAfterLogin'));
      expect(savedUrl).toBeNull();
    });

    test('navigates to a saved URL that includes a mainSearchTerm', async ({ page }) => {
      const targetUrl = '/search?mainSearchTerm=TIMBER&district=DFN';

      await page.addInitScript((url) => {
        sessionStorage.setItem('redirectAfterLogin', url);
      }, targetUrl);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/mainSearchTerm=TIMBER/);
      await expect(page).toHaveURL(/district=DFN/);

      const savedUrl = await page.evaluate(() => sessionStorage.getItem('redirectAfterLogin'));
      expect(savedUrl).toBeNull();
    });
  });
});
