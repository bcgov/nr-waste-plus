import { type FC } from 'react';

type YesNoValue = boolean | string | number | null | undefined;

const truthyStrings = new Set(['true', 't', 'y', 'yes']);

const toBoolean = (value: YesNoValue): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    return truthyStrings.has(value.trim().toLowerCase());
  }
  return false;
};

const YesNoTag: FC<{ value: YesNoValue }> = ({ value }) => {
  const boolValue = toBoolean(value);
  return <span>{boolValue ? 'Yes' : 'No'}</span>;
};

export default YesNoTag;
