import { DateTime } from 'luxon';

export const DATE_PICKER_FORMAT = 'yyyy/MM/dd';
export const API_DATE_FORMAT = 'yyyy-MM-dd';
export const MAX_TEXT_INPUT_LEN = 50;

export const getStartMaxDate = (value: string | null | undefined) => {
  const maxDate = value
    ? DateTime.fromFormat(value as string, API_DATE_FORMAT).toFormat(DATE_PICKER_FORMAT)
    : DateTime.now().toFormat(DATE_PICKER_FORMAT);

  return maxDate;
};

export const getEndMinDate = (value: string | null | undefined) => {
  const minDate = value
    ? DateTime.fromFormat(value as string, API_DATE_FORMAT).toFormat(DATE_PICKER_FORMAT)
    : undefined;

  return minDate;
};

export const getStartDateValue = (value: string | null | undefined) => {
  if (value) {
    return DateTime.fromFormat(value as string, API_DATE_FORMAT).toFormat(DATE_PICKER_FORMAT);
  }
  return undefined;
};

export const getEndDateValue = (value: string | null | undefined) => {
  if (value) {
    return DateTime.fromFormat(value as string, API_DATE_FORMAT).toFormat(DATE_PICKER_FORMAT);
  }
  return undefined;
};
