import { type FC } from 'react';

import type { CodeDescriptionDto } from '@/services/search.types';

const CodeDescriptionTag: FC<{ value: CodeDescriptionDto }> = ({ value }) => {
  return (
    <span>
      {value.code} - {value.description}
    </span>
  );
};

export default CodeDescriptionTag;
