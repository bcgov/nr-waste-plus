import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

  it('renders a React Router link for internal URL in same tab', () => {
    render(
      <MemoryRouter>
        <RedirectLinkTag text="Stay" url="/local" sameTab />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/local');
    expect(link.getAttribute('target')).toBe(null);
    expect(link.getAttribute('rel')).toBe(null);
    expect(screen.getByText('Stay')).toBeDefined();
  });

  it('renders external URL in same tab as anchor with _self target', () => {
    render(<RedirectLinkTag text="External" url="https://example.com/path" sameTab />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com/path');
    expect(link.getAttribute('target')).toBe('_self');
    expect(link.getAttribute('rel')).toBe(null);
  });
});
