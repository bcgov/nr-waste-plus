import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import EmptyValueTag from './index';

describe('EmptyValueTag', () => {
  describe('renders the value when provided', () => {
    it('renders a non-empty string', () => {
      render(<EmptyValueTag value="Test Value" />);
      expect(screen.getByText('Test Value')).not.toBeNull();
    });

    it('renders a numeric value', () => {
      render(<EmptyValueTag value={42} />);
      expect(screen.getByText('42')).not.toBeNull();
    });
  });

  describe('renders dash for empty values', () => {
    it('renders dash when value is null', () => {
      render(<EmptyValueTag value={null} />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });

    it('renders dash when value is undefined', () => {
      render(<EmptyValueTag value={undefined} />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });

    it('renders dash when value is empty string', () => {
      render(<EmptyValueTag value="" />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });

    it('renders dash when value is whitespace-only string', () => {
      render(<EmptyValueTag value="   " />);
      expect(screen.getByTestId('empty-value').textContent).toBe('-');
    });
  });
});
