import { DatePicker, DatePickerInput } from '@carbon/react';
import { DateTime } from 'luxon';
import { type FC } from 'react';

import {
  DATE_PICKER_FORMAT,
  getEndDateValue,
  getEndMinDate,
  getStartDateValue,
  getStartMaxDate,
} from './utils';

type AdvancedFilterDateRangeProps = {
  /** Current start date value from filters (API format: YYYY-MM-DD or empty string). */
  startDateValue?: string;
  /** Current end date value from filters (API format: YYYY-MM-DD or empty string). */
  endDateValue?: string;
  /** Callback handler for start date changes. */
  onStartDateChange: (dates?: Date[]) => void;
  /** Callback handler for end date changes. */
  onEndDateChange: (dates?: Date[]) => void;
};

/**
 * Renders a date range picker pair for filtering by last-updated date.
 *
 * Enforces logical date constraints:
 * - Start date cannot exceed end date (maxDate constraint)
 * - End date cannot be before start date (minDate constraint)
 * - End date cannot exceed today (maxDate constraint)
 *
 * Dates are stored in API format (YYYY-MM-DD) but displayed in user format (YYYY/MM/DD).
 *
 * @param props Component props.
 * @param props.startDateValue Current start date from filter state.
 * @param props.endDateValue Current end date from filter state.
 * @param props.onStartDateChange Handler fired when start date changes.
 * @param props.onEndDateChange Handler fired when end date changes.
 * @returns The date range picker pair.
 */
const AdvancedFilterDateRange: FC<AdvancedFilterDateRangeProps> = ({
  startDateValue,
  endDateValue,
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <div className="date-filter-container">
      {/* Start date picker */}
      <DatePicker
        className="advanced-date-picker"
        datePickerType="single"
        dateFormat="Y/m/d"
        locale={{ locale: 'en' }}
        allowInput
        maxDate={getStartMaxDate(endDateValue)}
        onChange={onStartDateChange}
        value={getStartDateValue(startDateValue)}
      >
        <DatePickerInput
          data-testid="start-date-picker-input-id"
          id="as-start-date-picker-input-id"
          size="md"
          labelText="Start date"
          placeholder="yyyy/mm/dd"
          helperText="Search by last update"
        />
      </DatePicker>

      {/* End date picker */}
      <DatePicker
        className="advanced-date-picker"
        datePickerType="single"
        dateFormat="Y/m/d"
        locale={{ locale: 'en' }}
        allowInput
        minDate={getEndMinDate(startDateValue)}
        maxDate={DateTime.now().toFormat(DATE_PICKER_FORMAT)}
        onChange={onEndDateChange}
        value={getEndDateValue(endDateValue)}
      >
        <DatePickerInput
          data-testid="end-date-picker-input-id"
          id="as-end-date-picker-input-id"
          size="md"
          labelText="End date"
          placeholder="yyyy/mm/dd"
          helperText="   "
        />
      </DatePicker>
    </div>
  );
};

export default AdvancedFilterDateRange;
