import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import GlobalErrorPage from './index';

import { createTestRouter } from '@/config/tests/routerTestHelper';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';

const renderPage = (error?: unknown) =>
  render(
    <RouterProvider
      router={createTestRouter(() => (
        <PageTitleProvider>
          <GlobalErrorPage error={error} />
        </PageTitleProvider>
      ))}
    />,
  );

describe('GlobalErrorPage', () => {
  it('shouldRenderFallbackMessage_whenNoErrorProvided', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('An unexpected error has occurred. Please try again later.'),
      ).toBeDefined();
    });
  });

  it('shouldRenderErrorMessage_whenErrorIsErrorInstance', async () => {
    renderPage(new Error('Boom goes the dynamite'));
    await waitFor(() => {
      screen.getByText('Global Error');
      screen.getByText('Boom goes the dynamite');
    });
  });

  it('shouldRenderErrorMessage_whenErrorIsString', async () => {
    renderPage('String error');
    await waitFor(() => {
      screen.getByText('Global Error');
      screen.getByText('String error');
    });
  });

  it('shouldRenderStatusText_whenErrorObjectHasStatusText', async () => {
    renderPage({ message: 'Another error', statusText: 'This is not a drill' });
    await waitFor(() => {
      screen.getByText('Global Error');
      screen.getByText('This is not a drill');
    });
  });

  it('shouldFallBackToMessage_whenStatusTextIsEmpty', async () => {
    renderPage({ message: 'That Error', statusText: '' });
    await waitFor(() => {
      screen.getByText('Global Error');
      screen.getByText('That Error');
    });
  });
});
