import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RoleErrorPage from './index';

import { createTestRouter } from '@/config/tests/routerTestHelper';

describe('RoleErrorPage', () => {
  it('shouldRenderFallbackMessage_whenNoReasonParamPresent', async () => {
    render(
      <RouterProvider
        router={createTestRouter(
          () => (
            <RoleErrorPage />
          ),
          '/unauthorized',
        )}
      />,
    );
    await waitFor(() => {
      screen.getByText('Unauthorized Access');
      expect(
        screen.getByText('You do not have the necessary permissions to view this page.'),
      ).toBeDefined();
    });
  });

  it('shouldRenderViolationMessage_whenReasonParamPresent', async () => {
    render(
      <RouterProvider
        router={createTestRouter(
          () => (
            <RoleErrorPage />
          ),
          '/unauthorized?reason=CONFLICTING_CLIENT_ACCESS_ROLES',
        )}
      />,
    );

    await waitFor(() => {
      screen.getByText('This account has conflicting client access roles');
    });
  });
});
