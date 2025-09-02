import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import CodeDescriptionTag from './index';

describe('CodeDescriptionTag', () => {
  it('renders code and description', () => {
    render(<CodeDescriptionTag value={{ code: 'A', description: 'Alpha' }} />);
    expect(screen.getByText('A - Alpha')).toBeDefined();
  });
});
