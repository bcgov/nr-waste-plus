import { DateTime } from 'luxon';
import { type FC } from 'react';

interface DateTagProps {
  date: string;
  format?: string;
}

/**
 * Formats an ISO date string for display and falls back to the original value when parsing fails.
 *
 * @param props The date tag props.
 * @param props.date The ISO date string to format.
 * @param props.format Optional Luxon format string.
 * @returns The formatted date or the raw value for invalid input.
 */
const DateTag: FC<DateTagProps> = ({ date, format = "MMMM dd, yyyy 'at' HH:mm" }) => {
  const parsedDate = DateTime.fromISO(date);
  if (parsedDate.isValid) {
    return <span>{parsedDate.toFormat(format)}</span>;
  } else {
    return <span data-testid="invalid-date">{date}</span>;
  }
};

export default DateTag;
