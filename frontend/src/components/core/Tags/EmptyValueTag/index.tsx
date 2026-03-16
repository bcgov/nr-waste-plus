import { type FC } from 'react';

/**
 * Displays a fallback dash when a value is empty.
 *
 * @param props The tag props.
 * @param props.value The value to render when present.
 * @returns The provided value or a placeholder dash.
 */
const EmptyValueTag: FC<{ value: string }> = ({ value }) => {
  if (value) {
    return <span>{value}</span>;
  } else {
    return <span data-testid="empty-value">-</span>;
  }
};

export default EmptyValueTag;
