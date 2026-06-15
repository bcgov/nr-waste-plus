import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';

import PrecisionNumberTag from './index';

describe('PrecisionNumberTag', () => {
  describe('renders formatted number with default precision (2)', () => {
    it('renders 3.14159 as "3.14"', () => {
      render(<PrecisionNumberTag value={3.14159} />);
      screen.getByText('3.14');
    });

    it('renders 10 as "10.00"', () => {
      render(<PrecisionNumberTag value={10} />);
      screen.getByText('10.00');
    });

    it('renders 0 as "0.00"', () => {
      render(<PrecisionNumberTag value={0} />);
      screen.getByText('0.00');
    });

    it('renders negative number correctly', () => {
      render(<PrecisionNumberTag value={-5.678} />);
      screen.getByText('-5.68');
    });
  });

  describe('custom precision', () => {
    it('renders with precision 4', () => {
      render(<PrecisionNumberTag value={3.14159} precision={4} />);
      screen.getByText('3.1416');
    });

    it('renders with precision 0', () => {
      render(<PrecisionNumberTag value={3.14159} precision={0} />);
      screen.getByText('3');
    });
  });

  describe('numeric string values', () => {
    it('renders numeric string correctly', () => {
      render(<PrecisionNumberTag value="42.5" />);
      screen.getByText('42.50');
    });

    it('renders integer string correctly', () => {
      render(<PrecisionNumberTag value="7" />);
      screen.getByText('7.00');
    });
  });

  describe('empty or invalid values render EmptyValueTag', () => {
    it('renders dash for null', () => {
      render(<PrecisionNumberTag value={null} />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });

    it('renders dash for undefined', () => {
      render(<PrecisionNumberTag value={undefined} />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });

    it('renders dash for empty string', () => {
      render(<PrecisionNumberTag value="" />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });

    it('renders dash for whitespace-only string', () => {
      render(<PrecisionNumberTag value="   " />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });

    it('renders dash for NaN', () => {
      render(<PrecisionNumberTag value={NaN} />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });

    it('renders dash for Infinity', () => {
      render(<PrecisionNumberTag value={Infinity} />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });

    it('renders dash for non-numeric string', () => {
      render(<PrecisionNumberTag value="abc" />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });
  });
});
