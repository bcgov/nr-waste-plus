import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import DateTag from './index';

describe('DateTag', () => {
  it('renders formatted date for valid ISO string', () => {
    render(<DateTag date="2025-08-29T14:30:00" />);
    expect(screen.getByText('August 29, 2025 at 14:30')).toBeDefined();
  });

  it('renders original string for invalid date', () => {
    render(<DateTag date="not-a-date" />);
    expect(screen.getByText('not-a-date')).toBeDefined();
  });

  it('renders original string for empty date', () => {
    render(<DateTag date="" />);
    expect(screen.getByTestId('invalid-date')).toBeDefined();
  });
});
