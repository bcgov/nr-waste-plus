import { Tooltip } from '@carbon/react';
import { Link } from '@tanstack/react-router';
import { type FC } from 'react';

import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';

/**
 * Props for the {@link RedirectLinkTag} component.
 */
interface RedirectLinkTagProps {
  /** Visible link text passed through to {@link EmptyValueTag}. */
  readonly text: string;
  /** Target URL. Path-only strings (e.g. `/search?q=x`) are treated as internal. */
  readonly url: string;
  /**
   * Controls whether the current URL's search params are inherited during
   * internal same-tab navigation.
   *
   * - `false` — preserve the current URL's search params (opt-in inheritance).
   * - `true` or omitted — do NOT inherit; only the params embedded in `url`
   *   itself are forwarded. This is the safe default for cross-route navigation.
   *
   * Only applicable to internal routes when `sameTab` is `true`.
   */
  readonly clearSearch?: boolean;
  /**
   * When `true`, the link opens in the current tab (`_self`).
   * Internal paths use a TanStack Router `<Link>`; external URLs use a plain `<a>`.
   * Defaults to `false` (new tab, `_blank`).
   */
  readonly sameTab?: boolean;
  /** Optional tooltip description attached to the rendered link itself. */
  readonly tooltip?: string;
}

/**
 * Determines whether a given URL should be treated as an internal application route.
 *
 * Internal links in this application are expected to be path-only URLs such as
 * `/search?param=value` or `/details/1`. These URLs do not include a protocol
 * or domain and should be handled by the TanStack Router {@link Link} component
 * to preserve SPA navigation.
 *
 * External links include a full domain (e.g., `https://google.com`) and should
 * be rendered using a standard `<a>` element.
 *
 * @param url - The URL to evaluate.
 * @returns `true` if the URL is internal (path‑only), otherwise `false`.
 */
const isInternal = (url: string): boolean => {
  // Internal URLs are path-only: start with / but not // (protocol-relative)
  return url.startsWith('/') && !url.startsWith('//');
};

/**
 * Renders a link-like value that chooses between the TanStack Router
 * {@link Link} component for internal navigation and a standard `<a>` element
 * for external URLs.
 *
 * Rules:
 * - Internal URLs (path‑only, e.g., `/details/1`) use `<Link>` when `sameTab` is true.
 * - External URLs (full domain, e.g., `https://example.com`) always use `<a>`.
 * - `sameTab` controls whether the link opens in the current tab (`_self`)
 *   or a new tab (`_blank`), regardless of internal/external.
 *
 * @returns The rendered link element.
 */
const RedirectLinkTag: FC<RedirectLinkTagProps> = ({
  text,
  url,
  sameTab,
  clearSearch,
  tooltip,
}) => {
  const internal = isInternal(url);
  const hasEmbeddedQuery = url.includes('?');

  // Passing a URL with embedded query params directly to `to` lets TanStack
  // Router parse them without re-encoding numeric-looking string values.
  // For bare paths, clear search by default unless `clearSearch` opts out.
  const link =
    internal && sameTab ? (
      <Link
        to={url}
        search={!hasEmbeddedQuery && clearSearch !== false ? {} : undefined}
        data-testid={text}
      >
        <EmptyValueTag value={text} />
      </Link>
    ) : (
      <a
        href={url}
        target={sameTab ? '_self' : '_blank'}
        rel={sameTab ? undefined : 'noopener noreferrer'}
        data-testid={text}
      >
        <EmptyValueTag value={text} />
      </a>
    );

  if (tooltip) {
    return (
      <Tooltip description={tooltip} align="top">
        {link}
      </Tooltip>
    );
  }

  return link;
};

export default RedirectLinkTag;
