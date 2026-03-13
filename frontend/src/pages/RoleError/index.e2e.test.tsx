import { test, expect } from '@playwright/test';

import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Role Error Page', () => {
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

  test('renders reason-specific text for known reason codes', async ({ page }) => {
    test.skip(
      test.info().project.metadata.userType === 'bceid',
      'BCeID test users can be redirected by role-validation rules before direct reason rendering.',
    );

    await page.goto('/unauthorized?reason=IDIR_MULTIPLE_ROLES');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Unauthorized Access')).toBeVisible();
    await expect(
      page.getByText('This account is not permitted to have multiple roles.'),
    ).toBeVisible();
  });

  test('falls back to generic unauthorized text for prototype-like reason values', async ({
    page,
  }) => {
    await page.goto('/unauthorized?reason=toString');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('You do not have the necessary permissions to view this page.'),
    ).toBeVisible();
  });

  test('redirects to role error when IDIR user has multiple assigned roles', async ({
    page,
  }, testInfo) => {
    test.skip(
      process.env.VITE_MOCK_AUTH?.toLowerCase() !== 'true',
      'Per-test role override requires VITE_MOCK_AUTH=true.',
    );

    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'idir',
      'cognito:groups': ['WASTE_PLUS_ADMIN', 'WASTE_PLUS_AREA'],
    });

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/reason=IDIR_MULTIPLE_ROLES/);
    await expect(
      page.getByText('This account is not permitted to have multiple roles.'),
    ).toBeVisible();
  });

  test('redirects to role error when BCeID user has forbidden assigned roles', async ({
    page,
  }, testInfo) => {
    test.skip(
      process.env.VITE_MOCK_AUTH?.toLowerCase() !== 'true',
      'Per-test role override requires VITE_MOCK_AUTH=true.',
    );

    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'bceidbusiness',
      'cognito:groups': ['WASTE_PLUS_DISTRICT'],
    });

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/reason=BCEID_ASSIGNED_ROLES/);
    await expect(
      page.getByText('This account is not permitted to have assigned roles.'),
    ).toBeVisible();
  });

  test('redirects to role error when abstract roles share clients', async ({ page }, testInfo) => {
    test.skip(
      process.env.VITE_MOCK_AUTH?.toLowerCase() !== 'true',
      'Per-test role override requires VITE_MOCK_AUTH=true.',
    );

    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'bceidbusiness',
      'cognito:groups': ['WASTE_PLUS_SUBMITTER_00010005', 'WASTE_PLUS_VIEWER_00010005'],
    });

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/reason=CONFLICTING_CLIENT_ACCESS_ROLES/);
    await expect(page.getByText('This account has conflicting client access roles')).toBeVisible();
  });

  test('redirects to role error when any abstract role has no clients', async (
    {
      page,
    },
    testInfo,
  ) => {
    test.skip(
      process.env.VITE_MOCK_AUTH?.toLowerCase() !== 'true',
      'Per-test role override requires VITE_MOCK_AUTH=true.',
    );

    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'bceidbusiness',
      'cognito:groups': ['WASTE_PLUS_SUBMITTER', 'WASTE_PLUS_VIEWER_00010005'],
    });

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/reason=CLIENT_ACCESS_REQUIRES_CLIENT/);
    await expect(page.getByText('This account requires at least one client')).toBeVisible();
  });
});
