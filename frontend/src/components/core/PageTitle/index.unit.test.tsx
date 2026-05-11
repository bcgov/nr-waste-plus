// src/components/PageTitle/PageTitle.browser.test.tsx

import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import PageTitle from './index';

import { createTestRouter } from '@/config/tests/routerTestHelper';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';

// Helper function to render PageTitle with props
const renderPageTitle = (
  props: React.ComponentProps<typeof PageTitle> & { children?: React.ReactNode },
) => {
  render(
    <RouterProvider
      router={createTestRouter(() => (
        <PageTitleProvider>
          <PageTitle {...props}>{props.children}</PageTitle>
        </PageTitleProvider>
      ))}
    />,
  );
};

describe('PageTitle (browser)', () => {
  it('renders title and subtitle', async () => {
    renderPageTitle({ title: 'Test Title', subtitle: 'Test Subtitle' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).to.equal('Test Title');
      expect(screen.getByText('Test Subtitle')).toBeDefined();
    });
  });

  it('renders breadcrumbs', async () => {
    const user = userEvent.setup();

    const breadCrumbs = [
      { name: 'Home', path: '/' },
      { name: 'Dashboard', path: '/dashboard' },
    ];

    renderPageTitle({ title: 'With Breadcrumbs', breadCrumbs });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeDefined();
    });

    // We're not mocking navigation here — just verifying it doesn't crash
    const dashboardCrumb = screen.getByText('Dashboard');
    await user.click(dashboardCrumb);
  });

  it('renders the experimental tag when experimental is true', async () => {
    renderPageTitle({ title: 'Experimental Page', experimental: true });
    // UnderConstructionTag renders a tag with text 'Under Construction' by default
    await waitFor(() => {
      expect(screen.getByText(/under construction/i)).toBeDefined();
    });
  });

  it('renders children components', async () => {
    renderPageTitle({
      title: 'With Children',
      children: <span data-testid="custom-child">Child Content</span>,
    });
    await waitFor(() => {
      expect(screen.getByTestId('custom-child').textContent).to.equal('Child Content');
    });
  });
});
