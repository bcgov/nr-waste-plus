import { Column, DatePicker, DatePickerInput } from '@carbon/react';

import { toDateValue, toIsoDate } from './format';
import { fieldError } from './formUtils';
import { validatePrimaryLoggingCompleteDate } from './validation';

type Props = {
  form: any;
  id: string;
  columnProps?: { max?: number; xlg?: number; lg?: number; md?: number; sm?: number };
};

const PrimaryLoggingCompleteDateField = ({
  form,
  id,
  columnProps = { max: 3, xlg: 4, lg: 5, md: 4, sm: 4 },
}: Props) => {
  const today = new Date();
  return (
    <Column {...columnProps}>
      <form.Field
        name="primaryLoggingCompleteDate"
        validators={{ onChange: ({ value }: { value: string }) => validatePrimaryLoggingCompleteDate(value) }}
      >
        {(field: any) => {
          const invalidText = fieldError(field.state.meta.errors);
          return (
            <DatePicker
              datePickerType="single"
              dateFormat="m/d/Y"
              allowInput
              maxDate={today}
              value={toDateValue(field.state.value)}
              onChange={(dates: Array<Date | undefined>) => {
                const [date] = dates;
                field.handleChange(date ? toIsoDate(date) : '');
              }}
            >
              <DatePickerInput
                id={id}
                labelText="Primary logging complete"
                placeholder="mm/dd/yyyy"
                onBlur={field.handleBlur}
                invalid={Boolean(invalidText)}
                invalidText={invalidText}
              />
            </DatePicker>
          );
        }}
      </form.Field>
    </Column>
  );
};

export default PrimaryLoggingCompleteDateField;
