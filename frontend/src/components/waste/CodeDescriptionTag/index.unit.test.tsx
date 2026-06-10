import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';

import CodeDescriptionTag from './index';

describe('CodeDescriptionTag', () => {
  it('renders code and description', () => {
    render(<CodeDescriptionTag value={{ code: 'A', description: 'Alpha' }} />);
    screen.getByText('A - Alpha');
  });
});
