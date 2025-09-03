import { type FC } from 'react';

import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';

type RedirectLinkTagProps = {
  text: string;
  url: string;
  sameTab?: boolean;
};

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
