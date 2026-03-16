import { DateTime } from 'luxon';

import { API_DATE_FORMAT, MAX_TEXT_INPUT_LEN } from './utils';

import type { CodeDescriptionDto, ReportingUnitSearchParametersViewDto } from '@/services/types';

/**
 * Provides curried handler factories for advanced filter inputs.
 *
 * Each handler factory takes a filter key and returns a handler function for that specific input type
 * (checkbox, multiselect, text, date). This pattern eliminates repetitive handler creation across
 * the modal and enables reusable, type-safe filter updates.
 *
 * @param onChange Factory function that creates onChange callbacks for a filter key.
 * @returns Object with handler factories for each input type.
 *
 * @example
 * ```tsx
 * const handlers = useAdvancedFilterHandlers(onChange);
 * <Checkbox onChange={handlers.onCheckBoxChange('requestByMe')} />
 * <TextInput onBlur={handlers.onTextChange('timberMark')} />
 * ```
 */
export const useAdvancedFilterHandlers = (
  onChange: (key: keyof ReportingUnitSearchParametersViewDto) => (value: unknown) => void,
) => {
  /**
   * Creates a checkbox handler for boolean filters.
   *
   * @param key The filter key to update.
   * @returns A checkbox change handler.
   */
  const onCheckBoxChange =
    (key: keyof ReportingUnitSearchParametersViewDto) =>
    (_: React.ChangeEvent<HTMLInputElement>, data: { checked: boolean; id: string }) => {
      onChange(key)(data.checked);
    };

  /**
   * Creates a multiselect handler that converts selected items to the expected filter shape.
   *
   * @param key The filter key to update.
   * @returns An ActiveMultiSelect change handler.
   */
  const onActiveMultiSelectChange =
    (key: keyof ReportingUnitSearchParametersViewDto) =>
    (changes: { selectedItems: CodeDescriptionDto[] }): void => {
      onChange(key)(changes.selectedItems);
    };

  /**
   * Creates a text input handler for a filter field.
   *
   * @param key The filter key to update.
   * @returns A blur handler for text inputs.
   */
  const onTextChange =
    (key: keyof ReportingUnitSearchParametersViewDto) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(key)(event.target.value);
    };

  /**
   * Creates a date picker handler that stores formatted API dates.
   *
   * @param isStartDate True to update the start date, false for the end date.
   * @returns A date picker change handler.
   */
  const handleDateChange = (isStartDate: boolean) => (dates?: Date[]) => {
    if (!dates) return;

    const formattedDate =
      dates.length && dates[0] ? DateTime.fromJSDate(dates[0]).toFormat(API_DATE_FORMAT) : '';

    onChange(isStartDate ? 'updateDateStart' : 'updateDateEnd')(formattedDate);
  };

  return {
    onCheckBoxChange,
    onActiveMultiSelectChange,
    onTextChange,
    handleDateChange,
  };
};
