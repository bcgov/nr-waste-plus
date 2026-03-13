import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import RoleErrorPage from './index';

describe('RoleErrorPage', () => {
  it('renders unauthorized access message', () => {
    render(
      <MemoryRouter>
        <RoleErrorPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Unauthorized Access')).toBeDefined();
    expect(
      screen.getByText('You do not have the necessary permissions to view this page.'),
    ).toBeDefined();
  });

  it('renders the violation-specific message when a reason is present', () => {
    render(
      <MemoryRouter initialEntries={['/unauthorized?reason=CONFLICTING_CLIENT_ACCESS_ROLES']}>
        <RoleErrorPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('This account has conflicting client access roles')).toBeDefined();
  });
});
