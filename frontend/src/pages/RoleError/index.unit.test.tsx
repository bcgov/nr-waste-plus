import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RoleErrorPage from './index';

import { renderWithApp } from '@/config/tests/renderWithApp';

describe('RoleErrorPage', () => {
  it('shouldRenderFallbackMessage_whenNoReasonParamPresent', async () => {
    renderWithApp(<RoleErrorPage />, { route: '/unauthorized' });
    await waitFor(() => {
      screen.getByText('Unauthorized Access');
      expect(
        screen.getByText('You do not have the necessary permissions to view this page.'),
      ).toBeDefined();
    });
  });

  it('shouldRenderViolationMessage_whenReasonParamPresent', async () => {
    renderWithApp(<RoleErrorPage />, { route: '/unauthorized?reason=CONFLICTING_CLIENT_ACCESS_ROLES' });

    await waitFor(() => {
      screen.getByText('This account has conflicting client access roles');
    });
  });
});
