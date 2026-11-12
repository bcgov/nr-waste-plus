import { Column, TextArea, TextInput, Toggle } from '@carbon/react';
import type { ChangeEvent } from 'react';

import ConditionalField from '@/components/Form/ConditionalField';

import { fieldError } from './formUtils';
import {
  validateDispersedRetentionExplanation,
  validateDispersedRetentionPct,
} from './validation';

type ColumnSpec = { max?: number; xlg?: number; lg?: number; md?: number; sm?: number };

type Props = {
  form: any;
  toggleId: string;
  pctId: string;
  explanationId: string;
  toggleColumn?: ColumnSpec;
  pctColumn?: ColumnSpec;
  explanationColumn?: ColumnSpec;
};

const DispersedRetentionFields = ({
  form,
  toggleId,
  pctId,
  explanationId,
  toggleColumn = { max: 3, xlg: 4, lg: 5, md: 8, sm: 4 },
  pctColumn = { max: 3, xlg: 4, lg: 5, md: 8, sm: 4 },
  explanationColumn = { max: 10, xlg: 8, lg: 6, md: 8, sm: 4 },
}: Props) => (
  <>
    <Column {...toggleColumn}>
      <form.Field name="hasDispersedRetention">
        {(field: any) => (
          <Toggle
            id={toggleId}
            labelText="Is dispersed retention >= 50%?"
            toggled={field.state.value}
            onToggle={(toggled: boolean) => {
              field.handleChange(toggled);
              if (!toggled) {
                form.setFieldValue('dispersedRetentionPct', '');
                form.setFieldValue('dispersedRetentionExplanation', '');
              }
            }}
            labelA="No"
            labelB="Yes"
          />
        )}
      </form.Field>
    </Column>

    <Column {...pctColumn}>
      <ConditionalField
        form={form as never}
        conditions={{ field: 'hasDispersedRetention', operator: 'truthy' }}
        fieldNames={['dispersedRetentionPct', 'dispersedRetentionExplanation']}
        unregisterOnHide={false}
      >
        <form.Field
          name="dispersedRetentionPct"
          validators={{
            onChangeListenTo: ['hasDispersedRetention'],
            onChange: ({ value, fieldApi }: { value: string; fieldApi: any }) =>
              validateDispersedRetentionPct(value, fieldApi.form.getFieldValue('hasDispersedRetention')),
          }}
        >
          {(field: any) => {
            const invalidText = fieldError(field.state.meta.errors);
            return (
              <TextInput
                id={pctId}
                labelText="Dispersed retention percentage"
                type="number"
                min={50}
                max={100}
                step={1}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.currentTarget.value)}
                invalid={Boolean(invalidText)}
                invalidText={invalidText}
              />
            );
          }}
        </form.Field>
      </ConditionalField>
    </Column>

    <Column {...explanationColumn}>
      <ConditionalField
        form={form as never}
        conditions={{ field: 'hasDispersedRetention', operator: 'truthy' }}
        fieldNames={['dispersedRetentionPct', 'dispersedRetentionExplanation']}
        unregisterOnHide={false}
      >
        <form.Field
          name="dispersedRetentionExplanation"
          validators={{
            onChangeListenTo: ['hasDispersedRetention'],
            onChange: ({ value, fieldApi }: { value: string; fieldApi: any }) =>
              validateDispersedRetentionExplanation(
                value,
                fieldApi.form.getFieldValue('hasDispersedRetention'),
              ),
          }}
        >
          {(field: any) => {
            const invalidText = fieldError(field.state.meta.errors);
            return (
              <TextArea
                id={explanationId}
                labelText="Explain how retention percentage was calculated"
                rows={3}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  field.handleChange(event.currentTarget.value)
                }
                invalid={Boolean(invalidText)}
                invalidText={invalidText}
              />
            );
          }}
        </form.Field>
      </ConditionalField>
    </Column>
  </>
);

export default DispersedRetentionFields;
