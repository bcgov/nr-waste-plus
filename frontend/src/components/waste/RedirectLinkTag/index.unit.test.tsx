import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RedirectLinkTag from './index';

import { createTestRouter } from '@/config/tests/routerTestHelper';

describe('RedirectLinkTag', () => {
  it('renders link with text and opens in new tab by default', () => {
    render(<RedirectLinkTag text="Go" url="https://example.com" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('Go')).toBeDefined();
  });

  it('renders a React Router link for internal URL in same tab', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => <RedirectLinkTag text="Stay" url="/local" sameTab />)}
      />,
    );
    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toBe('/local');
      expect(link.getAttribute('target')).toBe(null);
      expect(link.getAttribute('rel')).toBe(null);
      expect(screen.getByText('Stay')).toBeDefined();
    });
  });

  it('renders external URL in same tab as anchor with _self target', () => {
    render(<RedirectLinkTag text="External" url="https://example.com/path" sameTab />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com/path');
    expect(link.getAttribute('target')).toBe('_self');
    expect(link.getAttribute('rel')).toBe(null);
  });

  it('treats absolute same-origin URLs as external (not path-only)', () => {
    render(<RedirectLinkTag text="Absolute URL" url="https://localhost:5173/details/1" sameTab />);
    const link = screen.getByRole('link');
    // Should render as anchor with _self, not as React Router Link
    expect(link.getAttribute('href')).toBe('https://localhost:5173/details/1');
    expect(link.getAttribute('target')).toBe('_self');
    expect(link.getAttribute('rel')).toBe(null);
  });

  it('treats protocol-relative URLs as external', () => {
    render(<RedirectLinkTag text="Protocol-relative" url="//example.com/path" sameTab />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('//example.com/path');
    expect(link.getAttribute('target')).toBe('_self');
  });

  it('renders internal path-only URL in new tab as anchor with _blank', () => {
    render(<RedirectLinkTag text="Internal Default" url="/search?term=wood" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/search?term=wood');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});


describe('RedirectLinkTag', () => {
  it('renders link with text and opens in new tab by default', () => {
    render(<RedirectLinkTag text="Go" url="https://example.com" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('Go')).toBeDefined();
  });

  it('renders external URL in same tab as anchor with _self target', () => {
    render(<RedirectLinkTag text="External" url="https://example.com/path" sameTab />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com/path');
    expect(link.getAttribute('target')).toBe('_self');
    expect(link.getAttribute('rel')).toBe(null);
  });

  it('treats absolute same-origin URLs as external (not path-only)', () => {
    render(<RedirectLinkTag text="Absolute URL" url="https://localhost:5173/details/1" sameTab />);
    const link = screen.getByRole('link');
    // Should render as anchor with _self, not as React Router Link
    expect(link.getAttribute('href')).toBe('https://localhost:5173/details/1');
    expect(link.getAttribute('target')).toBe('_self');
    expect(link.getAttribute('rel')).toBe(null);
  });

  it('treats protocol-relative URLs as external', () => {
    render(<RedirectLinkTag text="Protocol-relative" url="//example.com/path" sameTab />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('//example.com/path');
    expect(link.getAttribute('target')).toBe('_self');
  });

  it('renders internal path-only URL in new tab as anchor with _blank', () => {
    render(<RedirectLinkTag text="Internal Default" url="/search?term=wood" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/search?term=wood');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
