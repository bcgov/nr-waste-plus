import { type FC } from 'react';

import type { CodeDescriptionDto } from '@/types/search.types.ts';

/**
 * Displays a code-description pair in a compact inline format.
 *
 * @param props The tag props.
 * @param props.value The code-description value to render.
 * @returns The combined code and description.
 */
const CodeDescriptionTag: FC<{ value: CodeDescriptionDto }> = ({ value }) => {
  // Backend `CodeDescriptionDto` fields are nullable; unresolved lookups
  // arrive with null code/description, so render the parts that exist and
  // fall back to a dash when nothing is resolvable.
  const label =
    value.code != null && value.code === value.description
      ? value.code
      : [value.code, value.description].filter((part): part is string => part != null).join(' - ');
  return <span>{label || '-'}</span>;
};

export default CodeDescriptionTag;
