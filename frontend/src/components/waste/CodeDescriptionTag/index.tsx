import { type FC } from 'react';

import type { CodeDescriptionDto } from '@/services/search.types';

/**
 * Displays a code-description pair in a compact inline format.
 *
 * @param props The tag props.
 * @param props.value The code-description value to render.
 * @returns The combined code and description.
 */
const CodeDescriptionTag: FC<{ value: CodeDescriptionDto }> = ({ value }) => {
  return (
    <span>
      {value.code} - {value.description}
    </span>
  );
};

export default CodeDescriptionTag;
