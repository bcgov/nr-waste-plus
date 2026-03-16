import { type FC } from 'react';

import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';

type RedirectLinkTagProps = {
  text: string;
  url: string;
  sameTab?: boolean;
};

/**
 * Renders a link-like value, falling back to the shared empty-value presentation when needed.
 *
 * @param props The redirect link props.
 * @param props.text The link text to display.
 * @param props.url The target URL.
 * @param props.sameTab When true, opens the URL in the current tab.
 * @returns The rendered anchor element.
 */
const RedirectLinkTag: FC<RedirectLinkTagProps> = ({ text, url, sameTab }) => {
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
