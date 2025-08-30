import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RedirectLinkTag from './index';

describe('RedirectLinkTag', () => {
  it('renders link with text and opens in new tab by default', () => {
    render(<RedirectLinkTag text="Go" url="https://example.com" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('Go')).toBeDefined();
  });

  it('renders link with text and opens in same tab if sameTab is true', () => {
    render(<RedirectLinkTag text="Stay" url="/local" sameTab />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/local');
    expect(link.getAttribute('target')).toBe('_self');
    expect(link.getAttribute('rel')).toBe(null);
    expect(screen.getByText('Stay')).toBeDefined();
  });
});
