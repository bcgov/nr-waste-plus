import { type FC } from 'react';
import { Link } from 'react-router-dom';

import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';

type RedirectLinkTagProps = {
  text: string;
  url: string;
  sameTab?: boolean;
};

/**
 * Determines whether a given URL should be treated as an internal application route.
 *
 * Internal links in this application are expected to be **path‑only** URLs,
 * such as `/search?param=value` or `/details/1`. These URLs do not include a
 * protocol or domain and should be handled by React Router to preserve SPA navigation.
 *
 * External links include a full domain (e.g., `https://google.com`) and should
 * be rendered using a standard `<a>` element.
 *
 * @param url The URL to evaluate.
 * @returns `true` if the URL is internal (path‑only), otherwise `false`.
 */
const isInternal = (url: string): boolean => {
  try {
    const parsed = new URL(url, globalThis.location.origin);
    return parsed.origin === globalThis.location.origin;
  } catch {
    return false;
  }
};

/**
 * Renders a link-like value that intelligently chooses between React Router's
 * `<Link>` component for internal navigation and a standard `<a>` element for
 * external URLs.
 *
 * Rules:
 * - Internal URLs (path‑only, e.g., `/details/1`) use `<Link>` when `sameTab` is true.
 * - External URLs (full domain, e.g., `https://example.com`) always use `<a>`.
 * - `sameTab` controls whether the link opens in the current tab (`_self`)
 *   or a new tab (`_blank`), regardless of internal/external.
 *
 * @param props The redirect link props.
 * @param props.text The text to display inside the link.
 * @param props.url The target URL.
 * @param props.sameTab When true, opens the link in the current tab.
 * @returns The rendered link element.
 */
const RedirectLinkTag: FC<RedirectLinkTagProps> = ({ text, url, sameTab }) => {
  const internal = isInternal(url);

  if (internal && sameTab) {
    return (
      <Link to={url}>
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
