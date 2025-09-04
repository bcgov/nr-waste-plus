import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AvatarImage from './index';

describe('AvatarImage', () => {
  it('renders initials for two-part name', () => {
    render(<AvatarImage userName="John Doe" size="large" />);
    expect(screen.getByText('JD')).toBeDefined();
    expect(screen.getByText('JD').parentElement).toHaveProperty('className', 'profile-image large');
  });

  it('renders initials for single-part name', () => {
    render(<AvatarImage userName="Alice" size="small" />);
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('A').parentElement).toHaveProperty('className', 'profile-image small');
  });

  it('renders empty initials for empty name', () => {
    render(<AvatarImage userName="" size="small" />);
    const initialsElement = screen.queryByTestId('avatar-initials');
    expect(initialsElement!.textContent).to.equal('');
  });

  it('renders only first two initials for names with more than two parts', () => {
    render(<AvatarImage userName="John Michael Doe" size="large" />);
    expect(screen.getByText('JM')).toBeDefined();
  });
});
