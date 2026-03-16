import { type FC } from 'react';

type YesNoValue = boolean | string | number | null | undefined;

const truthyStrings = new Set(['true', 't', 'y', 'yes']);

/**
 * Normalizes a loose truthy value into a boolean for display.
 *
 * @param value The raw value to normalize.
 * @returns True when the value should be treated as affirmative.
 */
const toBoolean = (value: YesNoValue): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    return truthyStrings.has(value.trim().toLowerCase());
  }
  return false;
};

/**
 * Displays a normalized yes-or-no label for loose boolean-like values.
 *
 * @param props The tag props.
 * @param props.value The raw value to normalize.
 * @returns `Yes` or `No`.
 */
const YesNoTag: FC<{ value: YesNoValue }> = ({ value }) => {
  const boolValue = toBoolean(value);
  return <span>{boolValue ? 'Yes' : 'No'}</span>;
};

export default YesNoTag;
