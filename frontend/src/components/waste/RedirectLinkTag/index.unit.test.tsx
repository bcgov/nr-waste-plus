import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RedirectLinkTag from './index';

import { createTestRouter } from '@/config/tests/routerTestHelper';

describe('RedirectLinkTag', () => {
  it('shouldRenderExternalLinkInNewTab_whenSameTabIsNotSet', () => {
    render(<RedirectLinkTag text="Go" url="https://example.com" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('Go')).toBeDefined();
  });

  it('shouldRenderRouterLinkForInternalUrl_whenSameTabIsTrue', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <RedirectLinkTag text="Stay" url="/local" sameTab />
        ))}
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

  it('shouldRenderAnchorWithSelfTarget_whenExternalUrlAndSameTab', () => {
    render(<RedirectLinkTag text="External" url="https://example.com/path" sameTab />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com/path');
    expect(link.getAttribute('target')).toBe('_self');
    expect(link.getAttribute('rel')).toBe(null);
  });

  it('shouldTreatAbsoluteUrlAsExternal_whenSameOriginAbsoluteUrl', () => {
    render(<RedirectLinkTag text="Absolute URL" url="https://localhost:5173/details/1" sameTab />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://localhost:5173/details/1');
    expect(link.getAttribute('target')).toBe('_self');
    expect(link.getAttribute('rel')).toBe(null);
  });

  it('shouldTreatProtocolRelativeUrlAsExternal_whenSameTabIsTrue', () => {
    render(<RedirectLinkTag text="Protocol-relative" url="//example.com/path" sameTab />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('//example.com/path');
    expect(link.getAttribute('target')).toBe('_self');
  });

  it('shouldRenderAnchorWithBlankTarget_whenInternalUrlAndSameTabIsNotSet', () => {
    render(<RedirectLinkTag text="Internal Default" url="/search?term=wood" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/search?term=wood');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shouldPassEmptySearchToRouterLink_whenClearSearchIsTrue', async () => {
    // We check that the router handles the navigation with search clearing
    // TanStack Link with search={} results in no search params in the href
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <RedirectLinkTag text="Clear" url="/target" sameTab clearSearch />
        ))}
      />,
    );
    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toBe('/target');
    });
  });

  it('shouldNotPassSearch_whenClearSearchIsExplicitlyFalse', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <RedirectLinkTag text="No Clear" url="/target" sameTab clearSearch={false} />
        ))}
      />,
    );
    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toBe('/target');
    });
  });

  it('shouldRenderAnchorTag_whenInternalUrlAndSameTabIsExplicitlyFalse', () => {
    render(<RedirectLinkTag text="False Tab" url="/internal/path" sameTab={false} />);
    const link = screen.getByRole('link');
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(link.getAttribute('href')).toBe('/internal/path');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shouldRenderRouterLink_whenInternalUrlContainsQueryParams', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <RedirectLinkTag text="Search" url="/results?q=wood&page=2" sameTab />
        ))}
      />,
    );
    await waitFor(() => {
      screen.getByRole('link');
      expect(screen.getByText('Search')).toBeDefined();
    });
  });

  it('shouldRenderDash_whenTextIsEmptyAndExternalLink', () => {
    render(<RedirectLinkTag text="" url="https://example.com" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toBe('-');
  });

  it('shouldRenderDash_whenTextIsEmptyAndInternalLinkWithSameTab', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <RedirectLinkTag text="" url="/details/1" sameTab />
        ))}
      />,
    );
    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link.textContent).toBe('-');
    });
  });
});
