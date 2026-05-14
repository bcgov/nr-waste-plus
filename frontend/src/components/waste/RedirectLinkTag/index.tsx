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
   * When `true`, any existing search parameters in the current URL are dropped.
   * Only applicable to internal routes when `sameTab` is true.
   */
  readonly clearSearch?: boolean;
  /**
   * When `true`, the link opens in the current tab (`_self`).
   * Internal paths use a TanStack Router `<Link>`; external URLs use a plain `<a>`.
   * Defaults to `false` (new tab, `_blank`).
   */
  readonly sameTab?: boolean;
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
 * @param props - The redirect link props.
 * @param props.text - The text to display inside the link.
 * @param props.url - The target URL.
 * @param props.sameTab - When `true`, opens the link in the current tab.
 * @param props.clearSearch - When `true`, resets the search parameters for internal navigation.
 * @returns The rendered link element.
 */
const RedirectLinkTag: FC<RedirectLinkTagProps> = ({ text, url, sameTab, clearSearch }) => {
  const internal = isInternal(url);

  if (internal && sameTab) {
    return (
      <Link to={url} search={clearSearch ? {} : undefined}>
        <EmptyValueTag value={text} />
      </Link>
    );
  }

  return (
    <a
      href={url}
      target={sameTab ? '_self' : '_blank'}
      rel={sameTab ? undefined : 'noopener noreferrer'}
    >
      <EmptyValueTag value={text} />
    </a>
  );
};

export default RedirectLinkTag;
