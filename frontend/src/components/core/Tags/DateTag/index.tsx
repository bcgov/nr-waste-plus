import { DateTime } from 'luxon';
import { type FC } from 'react';

interface DateTagProps {
  date: string;
  format?: string;
}

const DateTag: FC<DateTagProps> = ({ date, format = "MMMM dd, yyyy 'at' HH:mm" }) => {
  const parsedDate = DateTime.fromISO(date);
  if (parsedDate.isValid) {
    return <span>{parsedDate.toFormat(format)}</span>;
  } else {
    return <span data-testid="invalid-date">{date}</span>;
  }
};

export default DateTag;
