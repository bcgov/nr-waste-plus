import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';

import DateTag from './index';

describe('DateTag', () => {
  describe('default format', () => {
    it('renders formatted date for valid ISO string', () => {
      render(<DateTag date="2025-08-29T14:30:00" />);
      screen.getByText('August 29, 2025 at 14:30');
    });
  });

  describe('custom formats', () => {
    it('renders date only format', () => {
      render(<DateTag date="2025-08-29" format="MMMM dd, yyyy" />);
      screen.getByText('August 29, 2025');
    });

    it('renders time only format', () => {
      render(<DateTag date="2025-08-29T14:30:00" format="HH:mm" />);
      screen.getByText('14:30');
    });

    it('renders simplified date with no time', () => {
      render(<DateTag date="2025-08-29T14:30:00" format="MMM dd, yyyy" />);
      screen.getByText('Aug 29, 2025');
    });

    it('renders simplified date with time', () => {
      render(<DateTag date="2025-08-29T14:30:00" format="MMM dd, yyyy HH:mm" />);
      screen.getByText('Aug 29, 2025 14:30');
    });
  });

  describe('invalid dates', () => {
    it('renders original string for invalid date', () => {
      render(<DateTag date="not-a-date" />);
      screen.getByText('not-a-date');
    });

    it('renders original string for empty date', () => {
      render(<DateTag date="" />);
      screen.getByTestId('invalid-date');
    });
  });
});
