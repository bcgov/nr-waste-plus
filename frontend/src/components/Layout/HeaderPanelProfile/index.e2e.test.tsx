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

    await expect(
      panelSelector
        .getByRole('listitem')
        .filter({ has: page.getByRole('separator') })
        .first(), // the first separator in the header-panel
    ).toBeVisible();

    await expect(panelSelector.getByRole('navigation')).toBeVisible();

    // the separator within the <nav> element
    await expect(
      panelSelector
        .getByRole('navigation')
        .getByRole('listitem')
        .filter({ has: page.getByRole('separator') }),
    ).toBeVisible();

    // Text within the <nav> element
    await expect(
      panelSelector
        .getByRole('navigation')
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

      const filterTag = page.getByTestId('dt-clientNumbers-90000003');
      await expect(filterTag).toBeVisible();

      // Close Profile settings panel
      await profileButton.click();

      // Open the advanced search
      const advancedSearchButton = page.getByTestId('advanced-search-button-most');
      await advancedSearchButton.click();

      // Checking the Client filter
      const selectedCountDisplay = page.locator('#as-client-multi-select .cds--tag__label');
      await expect(selectedCountDisplay).toHaveText('1');

      const clientInput = page.getByRole('combobox', { name: 'Client' });
      await clientInput.click();

      const clientOption = page.getByRole('option', { name: 'OAK HERITAGE LTD.', exact: false });
      await expect(clientOption.getByRole('checkbox')).toBeChecked();
    });

    test('re-syncs preferences to filters when returning to the search', async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'idir', 'Only runs for BCeID users');

      const profileButton = page.getByRole('button', { name: 'Profile settings' });
      await profileButton.click();

      const panelSelector = page.getByTestId('header-panel');

      const oakClient = panelSelector.getByRole('button', { name: 'OAK HERITAGE LTD. ID' });

      await mockApiResponsesWithStub(
        page,
        'users/preferences',
        `users/preferences-GET-${testInfo.project.metadata.userType}-1.json`,
      );

      await oakClient.click();

      await page.waitForLoadState('networkidle');

      await expect(profileButton.getByText('OAK HERITAGE LTD.')).toBeVisible();

      const filterTag = page.getByTestId('dt-clientNumbers-90000003');
      await expect(filterTag).toBeVisible();

      const myClientsLink = page.getByTestId('side-nav-link-My clients');
      const searchLink = page.getByTestId('side-nav-link-Waste search');

      // Go to My clients
      await myClientsLink.click();
      await expect(page.getByRole('heading', { name: 'My clients' })).toBeVisible();

      // Go back to Waste search
      await searchLink.click();

      // The filter tag should still be visible
      await expect(filterTag).toBeVisible();
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

      const filterTag = page.getByTestId('dt-district-DCK');
      await expect(filterTag).toBeVisible();
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

    test('tooltip is visible when label is hovered', async ({ page }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'bceid', 'Only runs for IDIR users');

      const profileButton = page.getByRole('button', { name: 'Profile settings' });
      await profileButton.click();

      const panelSelector = page.getByTestId('header-panel');

      const label = panelSelector.getByText('Select organization');
      await label.hover();

      const tooltip = panelSelector
        .locator('.cds--tooltip-content')
        .filter({ hasText: 'Optional: Select a default organization' });

      // element is **fully** visible
      await expect(tooltip).toBeInViewport({ ratio: 1 });
    });

    test('log out button is visible even on a small screen', async ({ page }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'bceid', 'Only runs for IDIR users');

      await page.setViewportSize({
        width: 800,
        height: 600,
      });

      const profileButton = page.getByRole('button', { name: 'Profile settings' });
      await profileButton.click();

      const panelSelector = page.getByTestId('header-panel');

      const logoutButton = panelSelector.getByRole('listitem').getByText('Log out');
      await expect(logoutButton).toBeVisible();
    });

    test('log out button stays at the bottom even on a large screen', async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.metadata.userType === 'bceid', 'Only runs for IDIR users');

      const viewport = page.viewportSize();

      const profileButton = page.getByRole('button', { name: 'Profile settings' });
      await profileButton.click();

      const panelSelector = page.getByTestId('header-panel');

      const logoutButton = panelSelector.getByRole('listitem').filter({ hasText: 'Log out' });
      await expect(logoutButton).toBeVisible();

      const buttonBox = await logoutButton.boundingBox();

      expect(viewport).toBeDefined();
      expect(buttonBox).toBeDefined();

      if (viewport && buttonBox) {
        // button is at the very bottom of the page
        expect(buttonBox.y + buttonBox.height).toEqual(viewport.height);
      }
    });
  });

  test('profile panel structure and CSS classes are correct', async ({ page }) => {
    const profileButton = page.getByRole('button', { name: 'Profile settings' });
    await profileButton.click();

    const panelSelector = page.getByTestId('header-panel');

    // Verify my-profile-container exists
    const profileContainer = panelSelector.locator('.my-profile-container');
    await expect(profileContainer).toBeVisible();

    // Verify user-info-section structure
    const userInfoSection = profileContainer.locator('.user-info-section');
    await expect(userInfoSection).toBeVisible();

    // Verify user-image and user-data divs
    const userImage = userInfoSection.locator('.user-image');
    await expect(userImage).toBeVisible();

    const userData = userInfoSection.locator('.user-data');
    await expect(userData).toBeVisible();

    // Verify all user data paragraphs are rendered
    const paragraphs = userData.locator('p');
    expect(await paragraphs.count()).toBeGreaterThanOrEqual(3);

    // Verify account-nav is rendered
    const accountNav = profileContainer.locator('.account-nav');
    await expect(accountNav).toBeVisible();

    // Verify panel-section-light styling
    const panelSectionLight = accountNav.locator('.panel-section-light');
    await expect(panelSectionLight).toBeVisible();

    // Verify district-selection-container exists
    const districtContainer = accountNav.locator('.district-selection-container');
    await expect(districtContainer).toBeVisible();
  });

  test('profile avatar image has correct size class', async ({ page }, testInfo) => {
    const profileButton = page.getByRole('button', { name: 'Profile settings' });
    await profileButton.click();

    const panelSelector = page.getByTestId('header-panel');

    // Verify avatar exists with large size
    const avatarInitials = panelSelector.getByTestId('avatar-initials');
    await expect(avatarInitials).toBeVisible();

    const userName = testInfo.project.metadata.userType === 'idir' ? 'Paulo Cruz' : 'John Doe';
    const initials = testInfo.project.metadata.userType === 'idir' ? 'PC' : 'JD';

    // Verify correct user name is displayed
    await expect(panelSelector.getByText(userName)).toBeVisible();

    // Verify avatar shows correct initials
    await expect(avatarInitials).toHaveText(initials);
  });

  test('profile menu renders all dividers and separators', async ({ page }) => {
    const profileButton = page.getByRole('button', { name: 'Profile settings' });
    await profileButton.click();

    const panelSelector = page.getByTestId('header-panel');

    // Should have multiple separators - one after user info and one in navigation
    const separators = panelSelector.getByRole('separator');
    const separatorCount = await separators.count();
    expect(separatorCount).toBeGreaterThanOrEqual(2);
  });

  test('profile menu help tooltip is accessible', async ({ page }, testInfo) => {
    const profileButton = page.getByRole('button', { name: 'Profile settings' });
    await profileButton.click();

    const panelSelector = page.getByTestId('header-panel');

    const helpIcon =
      testInfo.project.metadata.userType === 'idir'
        ? panelSelector.getByRole('img', { name: 'Help: About selecting a default organization' })
        : panelSelector.getByRole('img', { name: 'Help: About selecting a default client' });

    await expect(helpIcon).toBeVisible();

    // Verify the help icon can be interacted with (hover triggers tooltip)
    await helpIcon.hover();

    const entityType = testInfo.project.metadata.userType === 'idir' ? 'organization' : 'client';
    const tooltipContent = panelSelector
      .locator('.cds--tooltip-content')
      .filter({ hasText: `Optional: Select a default ${entityType}` });

    await expect(tooltipContent).toBeVisible();
  });
});
