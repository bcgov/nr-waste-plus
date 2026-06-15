import { type FC } from 'react';

import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';

interface PrecisionNumberTagProps {
  value: number | string | null | undefined;
  precision?: number;
}

/** Formats a number with configurable decimal precision, falling back to EmptyValueTag for empty or invalid values.
 *
 * Delegates to `EmptyValueTag` when value is null, undefined, empty string,
 * whitespace-only string, NaN, Infinity, or a non-numeric string. Valid numbers
 * (including `0` and negative values) are formatted with `Number.toFixed()`.
 *
 * @param props The component props.
 * @param props.value The number or numeric string to format. Null/undefined renders a dash.
 * @param props.precision Decimal places for `toFixed` (default: 2). Values outside the 0100 range are clamped.
 * @returns A `<span>` with the formatted number or an `EmptyValueTag` dash.
 * @example
 * <PrecisionNumberTag value={123.456} precision={2} /> // renders "123.46"
 * <PrecisionNumberTag value={null} /> // renders <EmptyValueTag />
 * <PrecisionNumberTag value="789.123" precision={1} /> // renders "789.1"
 */
const PrecisionNumberTag: FC<PrecisionNumberTagProps> = ({ value, precision = 2 }) => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return <EmptyValueTag value={value} />;
  }

  const parsedNumber = Number(value);
  if (!Number.isFinite(parsedNumber)) return <EmptyValueTag value={null} />;

  const normalizedPrecision = Number.isFinite(precision) ? Math.trunc(precision) : 2;
  const safePrecision = Math.min(100, Math.max(0, normalizedPrecision));

  return <span>{parsedNumber.toFixed(safePrecision)}</span>;
};

export default PrecisionNumberTag;
