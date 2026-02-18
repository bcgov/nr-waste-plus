import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import DateTag from './index';

describe('DateTag', () => {
  describe('default format', () => {
    it('renders formatted date for valid ISO string', () => {
      render(<DateTag date="2025-08-29T14:30:00" />);
      expect(screen.getByText('August 29, 2025 at 14:30')).toBeDefined();
    });
  });

  describe('custom formats', () => {
    it('renders date only format', () => {
      render(<DateTag date="2025-08-29" format="MMMM dd, yyyy" />);
      expect(screen.getByText('August 29, 2025')).toBeDefined();
    });

    it('renders time only format', () => {
      render(<DateTag date="2025-08-29T14:30:00" format="HH:mm" />);
      expect(screen.getByText('14:30')).toBeDefined();
    });

    it('renders simplified date with no time', () => {
      render(<DateTag date="2025-08-29T14:30:00" format="MMM dd, yyyy" />);
      expect(screen.getByText('Aug 29, 2025')).toBeDefined();
    });

    it('renders simplified date with time', () => {
      render(<DateTag date="2025-08-29T14:30:00" format="MMM dd, yyyy HH:mm" />);
      expect(screen.getByText('Aug 29, 2025 14:30')).toBeDefined();
    });
  });

  describe('invalid dates', () => {
    it('renders original string for invalid date', () => {
      render(<DateTag date="not-a-date" />);
      expect(screen.getByText('not-a-date')).toBeDefined();
    });

    it('renders original string for empty date', () => {
      render(<DateTag date="" />);
      expect(screen.getByTestId('invalid-date')).toBeDefined();
    });
  });
});
