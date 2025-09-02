import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RoleErrorPage from './index';

describe('RoleErrorPage', () => {
  it('renders unauthorized access message', () => {
    render(<RoleErrorPage />);
    expect(screen.getByText('Unauthorized Access')).toBeDefined();
    expect(
      screen.getByText('You do not have the necessary permissions to view this page.'),
    ).toBeDefined();
  });
});
