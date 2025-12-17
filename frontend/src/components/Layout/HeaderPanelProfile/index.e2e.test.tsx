import { test, expect } from '@playwright/test';

import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Profile menu', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await mockApiResponsesWithStub(page, 'users/preferences', `users/preferences-GET.json`);

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

    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test('profile menu can be open with basic info', async ({ page }, projectInfo) => {
    const profileButton = page.getByRole('button', { name: 'Profile settings' });
    await profileButton.click();

    const panelSelector = page.getByTestId('header-panel');

    await expect(panelSelector).toBeVisible();

    await expect(
      panelSelector.getByRole('heading', { level: 4, name: 'My Profile' }),
    ).toBeVisible();

    await expect(panelSelector.getByRole('button', { name: 'Close' })).toBeVisible();

    await expect(panelSelector.getByRole('separator')).toBeVisible();

    await expect(panelSelector.getByRole('navigation')).toBeVisible();

    await expect(
      panelSelector
        .getByRole('listitem')
        .getByText(
          projectInfo.project.metadata.userType === 'idir'
            ? 'Select organization'
            : 'Select client',
        ),
    ).toBeVisible();

    if (projectInfo.project.metadata.userType === 'idir') {
      await expect(
        panelSelector.getByRole('searchbox', { name: 'Search by district name or code' }),
      ).toBeVisible();
    }

    await expect(panelSelector.getByRole('button', { name: 'Select none' })).toBeVisible();
    await expect(panelSelector.getByText('Select none')).toBeVisible();

    await expect(panelSelector.getByRole('listitem').getByText('Log out')).toBeVisible();
  });

  test.describe('BCeID user', () => {
    test('profile info for BCeID', async ({ page }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'idir', 'Only runs for BCeID users');
      const profileButton = page.getByRole('button', { name: 'Profile settings' });
      await profileButton.click();

      const panelSelector = page.getByTestId('header-panel');

      await expect(panelSelector).toBeVisible();

      const avatarInitials = panelSelector.getByTestId('avatar-initials');
      await expect(avatarInitials).toBeVisible();
      await expect(avatarInitials).toHaveText('JD');

      await expect(panelSelector.getByText('John Doe')).toBeVisible();

      await expect(panelSelector.getByText('BCEIDBUSINESS\\alliance_uat')).toBeVisible();

      await expect(panelSelector.getByText('Email: notarealemail@gov.bc.ca')).toBeVisible();

      await expect(
        panelSelector.getByRole('img', { name: 'Help: About selecting a default client' }),
      ).toBeVisible();

      await expect(
        panelSelector.getByRole('list', { name: 'List of possible values' }),
      ).toBeVisible();

      await expect(panelSelector.getByRole('button', { name: 'Select none' })).toBeVisible();
      await expect(panelSelector.getByText('Select none')).toBeVisible();
    });

    test('select OAK HERITAGE LTD.', async ({ page }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'idir', 'Only runs for BCeID users');

      const profileButton = page.getByRole('button', { name: 'Profile settings' });
      await profileButton.click();

      const panelSelector = page.getByTestId('header-panel');

      await expect(panelSelector).toBeVisible();

      await expect(
        panelSelector.getByRole('heading', { level: 4, name: 'My Profile' }),
      ).toBeVisible();

      const oakClient = panelSelector.getByRole('button', { name: 'OAK HERITAGE LTD. ID' });
      await expect(oakClient).toBeVisible();

      await mockApiResponsesWithStub(
        page,
        'users/preferences',
        `users/preferences-GET-${testInfo.project.metadata.userType}-1.json`,
      );

      await oakClient.click();

      await page.waitForLoadState('networkidle');

      await expect(profileButton.getByText('OAK HERITAGE LTD.')).toBeVisible();
    });
  });

  test.describe('IDIR user', () => {
    test('profile info for IDIR', async ({ page }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'bceid', 'Only runs for IDIR users');
      const profileButton = page.getByRole('button', { name: 'Profile settings' });
      await profileButton.click();

      const panelSelector = page.getByTestId('header-panel');

      await expect(panelSelector).toBeVisible();

      const avatarInitials = panelSelector.getByTestId('avatar-initials');
      await expect(avatarInitials).toBeVisible();
      await expect(avatarInitials).toHaveText('PC');

      await expect(panelSelector.getByText('Paulo Cruz')).toBeVisible();

      await expect(panelSelector.getByText('IDIR\\PCRUZ')).toBeVisible();

      await expect(panelSelector.getByText('Email: paulo.cruz@gov.bc.ca')).toBeVisible();

      await expect(
        panelSelector.getByRole('img', { name: 'Help: About selecting a default organization' }),
      ).toBeVisible();

      await expect(
        panelSelector.getByRole('search', { name: 'Search by district name or code' }),
      ).toBeVisible();
      await expect(panelSelector.getByText('Search by district name or code')).toBeVisible();
      await expect(
        panelSelector.getByRole('searchbox', { name: 'Search by district name or code' }),
      ).toBeVisible();

      await expect(
        panelSelector.getByRole('list', { name: 'List of possible values' }),
      ).toBeVisible();

      await expect(panelSelector.getByRole('button', { name: 'Select none' })).toBeVisible();
      await expect(panelSelector.getByText('Select none')).toBeVisible();
    });

    test('select Chilliwack', async ({ page }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'bceid', 'Only runs for IDIR users');

      const profileButton = page.getByRole('button', { name: 'Profile settings' });
      await profileButton.click();

      const panelSelector = page.getByTestId('header-panel');

      await expect(panelSelector).toBeVisible();

      await expect(
        panelSelector.getByRole('heading', { level: 4, name: 'My Profile' }),
      ).toBeVisible();

      const chilliwackDistrict = panelSelector.getByRole('button', { name: 'Chilliwack' });
      await expect(chilliwackDistrict).toBeVisible();

      await mockApiResponsesWithStub(
        page,
        'users/preferences',
        `users/preferences-GET-${testInfo.project.metadata.userType}-1.json`,
      );

      await chilliwackDistrict.click();

      await page.waitForResponse(
        (response) => response.url().includes('users/preferences') && response.status() === 200,
      );

      await expect(profileButton.getByText('Chilliwack')).toBeVisible();
    });

    test('filter Haida Gwaii', async ({ page }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'bceid', 'Only runs for IDIR users');

      const profileButton = page.getByRole('button', { name: 'Profile settings' });
      await profileButton.click();

      const panelSelector = page.getByTestId('header-panel');

      await expect(panelSelector).toBeVisible();

      await expect(
        panelSelector.getByRole('heading', { level: 4, name: 'My Profile' }),
      ).toBeVisible();

      const searchBox = panelSelector.getByRole('searchbox', {
        name: 'Search by district name or code',
      });
      await expect(searchBox).toBeVisible();

      await searchBox.fill('Haida Gwaii');

      const haidaGwaiiDistrict = panelSelector.getByRole('button', { name: 'Haida Gwaii' });
      await expect(haidaGwaiiDistrict).toBeVisible();

      const chilliwackDistrict = panelSelector.getByRole('button', { name: 'Chilliwack' });
      await expect(chilliwackDistrict).not.toBeVisible();
    });
  });
});
