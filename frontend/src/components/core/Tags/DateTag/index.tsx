import { DateTime } from 'luxon';
import { type FC } from 'react';

const DateTag: FC<{ date: string }> = ({ date }) => {
  const parsedDate = DateTime.fromISO(date);
  if (parsedDate.isValid) {
    return <span>{parsedDate.toFormat("MMMM dd, yyyy 'at' HH:mm")}</span>;
  } else {
    return <span data-testid="invalid-date">{date}</span>;
  }
};

export default DateTag;
