import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import EmptyValueTag from './index';

describe('EmptyValueTag', () => {
  it('renders the value when provided', () => {
    render(<EmptyValueTag value="Test Value" />);
    expect(screen.getByText('Test Value')).not.toBeNull();
  });

  it('renders dash when value is empty string', () => {
    render(<EmptyValueTag value="" />);
    expect(screen.getByTestId('empty-value').textContent).toBe('-');
  });

  it('renders dash when value is undefined', () => {
    // @ts-expect-error: testing undefined value
    render(<EmptyValueTag value={undefined} />);
    expect(screen.getByTestId('empty-value').textContent).toBe('-');
  });
});
