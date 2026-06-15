import { type FC } from 'react';

/**
 * Renders a value or a fallback dash placeholder for empty/missing values.
 *
 * Handles `null`, `undefined`, empty strings, and whitespace-only strings
 * by displaying a dash (`-`) with `data-testid="empty-value"`. Numeric
 * values (including `0`) and non-empty strings are rendered as-is.
 *
 * @param props The component props.
 * @param props.value The value to display. Accepts strings, numbers, null, or undefined.
 * @returns A `<span>` with the value or a `<span>` with a dash placeholder.
 */
const EmptyValueTag: FC<{ value: string | number | null | undefined }> = ({ value }) => {
  if (
    value !== null &&
    value !== undefined &&
    value !== '' &&
    !(typeof value === 'string' && value.trim() === '')
  ) {
    return <span>{value}</span>;
  } else {
    return <span data-testid="empty-value">-</span>;
  }
};

export default EmptyValueTag;
