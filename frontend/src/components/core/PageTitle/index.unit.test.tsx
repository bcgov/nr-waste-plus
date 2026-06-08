import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import PageTitle from './index';

import { renderWithApp } from '@/config/tests/renderWithApp';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';

// Helper function to render PageTitle with props
const renderPageTitle = (
  props: React.ComponentProps<typeof PageTitle> & { children?: React.ReactNode },
) => {
  renderWithApp(
    <PageTitleProvider>
      <PageTitle {...props}>{props.children}</PageTitle>
    </PageTitleProvider>,
  );
};

describe('PageTitle', () => {
  it('shouldRenderTitleAndSubtitle_whenProvided', async () => {
    renderPageTitle({ title: 'Test Title', subtitle: 'Test Subtitle' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Test Title');
      screen.getByText('Test Subtitle');
    });
  });

  it('shouldRenderBreadcrumbs_whenBreadCrumbsProvided', async () => {
    const user = userEvent.setup();

    const breadCrumbs = [
      { name: 'Home', path: '/' },
      { name: 'Dashboard', path: '/dashboard' },
    ];

    renderPageTitle({ title: 'With Breadcrumbs', breadCrumbs });

    await waitFor(() => {
      screen.getByText('Dashboard');
    });

    // We're not mocking navigation here — just verifying it doesn't crash
    const dashboardCrumb = screen.getByText('Dashboard');
    await user.click(dashboardCrumb);
  });

  it('shouldRenderExperimentalTag_whenExperimentalIsTrue', async () => {
    renderPageTitle({ title: 'Experimental Page', experimental: true });
    await waitFor(() => {
      screen.getByText(/under construction/i);
    });
  });

  it('shouldRenderChildren_whenChildrenProvided', async () => {
    renderPageTitle({
      title: 'With Children',
      children: <span>Child Content</span>,
    });
    await waitFor(() => {
      screen.getByText('Child Content');
    });
  });
});
