import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import NotFoundPage from './index';

import { createTestRouter } from '@/config/tests/routerTestHelper';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';

describe('NotFoundPage', () => {
  it('shouldRenderNotFoundMessage_whenRendered', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <PageTitleProvider>
            <NotFoundPage />
          </PageTitleProvider>
        ))}
      />,
    );
    await waitFor(() => {
      screen.getByText('Content Not Found');
      screen.getByText('The page you are looking for does not exist.');
    });
  });
});
