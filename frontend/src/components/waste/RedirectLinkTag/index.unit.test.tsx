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
    expect(link.dataset.testid).toBe('Go');
    screen.getByText('Go');
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
      expect(link.dataset.testid).toBe('Stay');
      screen.getByText('Stay');
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

  it('shouldProduceCleanHref_whenClearSearchIsTrue_andRouterHasActiveSearchParams', async () => {
    render(
      <RouterProvider
        router={createTestRouter(
          () => (
            <RedirectLinkTag text="RU" url="/reporting-units/123" sameTab clearSearch />
          ),
          '/search?mainSearchTerm=TIMBER&district=DCR',
        )}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole('link').getAttribute('href')).toBe('/reporting-units/123');
    });
  });

  it('shouldNotPassSearch_whenClearSearchIsExplicitlyFalse_andNoActiveParams', async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <RedirectLinkTag text="No Clear" url="/target" sameTab clearSearch={false} />
        ))}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole('link').getAttribute('href')).toBe('/target');
    });
  });

  it('shouldNotAddInheritedSearchParams_whenClearSearchIsFalse_andDestinationHasNoBareParams', async () => {
    // clearSearch=false passes search=undefined to TanStack Router.
    // For a bare path (no embedded query), TanStack Router uses the destination
    // route's default search — which for routes with no schema means no params.
    // Cross-route search inheritance does NOT occur in the in-memory test router.
    render(
      <RouterProvider
        router={createTestRouter(
          () => (
            <RedirectLinkTag text="RU" url="/reporting-units/123" sameTab clearSearch={false} />
          ),
          '/search?mainSearchTerm=TIMBER',
        )}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole('link').getAttribute('href')).toBe('/reporting-units/123');
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
    // The full URL is passed as `to` so TanStack Router parses the query string
    // directly from the URL string — avoiding the JSON re-encoding of
    // numeric-looking string values that would occur if we extracted params into
    // a JS object and forwarded them via the `search` prop.
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <RedirectLinkTag text="Search" url="/results?q=wood&page=2" sameTab />
        ))}
      />,
    );
    await waitFor(() => {
      const href = screen.getByRole('link').getAttribute('href') ?? '';
      // TanStack Router parses '2' from the URL string as a number, so it
      // re-serialises cleanly as page=2 (no JSON-encoding artefacts).
      expect(href).toContain('/results');
      expect(href).toContain('q=wood');
      expect(href).toContain('page=');
      screen.getByText('Search');
    });
  });

  it('shouldForwardEmbeddedUrlParams_whenNavigatingFromUrlWithOtherSearchParams', async () => {
    render(
      <RouterProvider
        router={createTestRouter(
          () => (
            <RedirectLinkTag text="Client" url="/search?clientNumbers=00001001" sameTab />
          ),
          '/clients?tab=recent',
        )}
      />,
    );
    await waitFor(() => {
      const href = screen.getByRole('link').getAttribute('href') ?? '';
      expect(href).toContain('clientNumbers=00001001');
      // Must NOT inherit `tab=recent` from the source page.
      expect(href).not.toContain('tab=recent');
    });
  });

  it('shouldProduceCleanHref_byDefault_whenNavigatingCrossRoute_withActiveSearchParams', async () => {
    // When clearSearch is omitted (the default), inherited search params must
    // NOT be carried over to a different route.
    render(
      <RouterProvider
        router={createTestRouter(
          () => (
            <RedirectLinkTag text="RU" url="/reporting-units/456" sameTab />
          ),
          '/search?mainSearchTerm=WOOD&district=DCR&status=ACT',
        )}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole('link').getAttribute('href')).toBe('/reporting-units/456');
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
