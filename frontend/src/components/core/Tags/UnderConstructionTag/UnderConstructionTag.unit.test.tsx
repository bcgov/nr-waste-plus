import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UnderConstructionTag from './index';

describe('UnderConstructionTag', () => {
  it('renders a polite live region so screen readers announce it on appearance', () => {
    render(<UnderConstructionTag />);
    const tag = screen.getByRole('status');
    expect(tag).toContainText('Under construction');
    expect(tag.getAttribute('aria-live')).toBe('polite');
  });

  it('announces the page variant with the page-specific tooltip text', () => {
    render(<UnderConstructionTag type="page" />);
    expect(screen.getByRole('status')).toContainText('Under construction');
  });
});
