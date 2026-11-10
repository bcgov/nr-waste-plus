import {
  Column,
  ComboBox,
  DatePicker,
  DatePickerInput,
  Grid,
  TextArea,
  TextInput,
  Toggle,
} from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import { type ChangeEvent } from 'react';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import ConditionalField from '@/components/Form/ConditionalField';
import TimberMarkRepeatSection from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/TimberMarkRepeatSection';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import {
  validateDispersedRetentionExplanation,
  validateDispersedRetentionPct,
  validatePrimaryLoggingCompleteDate,
} from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/validation';
import {
  codeDescriptionToString,
  toSelectedItems,
} from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/format';

import SubmissionDetailsHeader from './Header';
import { normalizeInitialValues, toSelectedItem } from './types';

import type { InteriorSubmissionDetailsFormProps } from './types';

type FormViewProps = Omit<InteriorSubmissionDetailsFormProps, 'mode'>;

const fieldError = (errors: readonly unknown[]): string | undefined => {
  const first = errors.find((error) => typeof error === 'string' && error.length > 0);
  return typeof first === 'string' ? first : undefined;
};

/**
 * Editable Interior submission-details view with local form state.
 *
 * Option lists and read-only benchmark values are supplied by the containing
 * page so this component does not assume an API contract or maintain a
 * duplicate code list.
 *
 * @param props - Seed data, option lists, and the add-mark callbacks.
 * @returns The Interior submission-details form view.
 */
export const InteriorSubmissionDetailsFormView = ({
  initialValues,
  harvestStatuses,
  becZones,
  becSubzoneVariants,
  districtAverageCriteria,
  onAddSecondaryTimberMark: _onAddSecondaryTimberMark,
  onAddRoadPermitTimberMark: _onAddRoadPermitTimberMark,
}: FormViewProps) => {
  const form = useForm({ defaultValues: normalizeInitialValues(initialValues) });
  const today = new Date();

  return (
    <section className="interior-submission-details" aria-labelledby="interior-submission-heading">
      <form
        aria-label="Interior submission details"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <SubmissionDetailsHeader />
        <Grid className="interior-submission-details__details-grid">
          <Column max={3} xlg={4} lg={5} md={4} sm={4}>
            <form.Field
              name="primaryLoggingCompleteDate"
              validators={{ onChange: ({ value }) => validatePrimaryLoggingCompleteDate(value) }}
            >
              {(field) => {
                const invalidText = fieldError(field.state.meta.errors);
                return (
                  <DatePicker
                    datePickerType="single"
                    dateFormat="m/d/Y"
                    allowInput
                    maxDate={today}
                    value={field.state.value ? [new Date(`${field.state.value}T00:00:00`)] : []}
                    onChange={([date]) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        field.handleChange(`${year}-${month}-${day}`);
                      } else {
                        field.handleChange('');
                      }
                    }}
                  >
                    <DatePickerInput
                      id="interior-primary-logging-date"
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

          <Column max={3} xlg={4} lg={5} md={4} sm={4}>
            <form.Field name="harvestStatusCode">
              {(field) => (
                <ComboBox
                  id="interior-harvest-status"
                  titleText="Harvest status"
                  items={[...harvestStatuses]}
                  itemToString={codeDescriptionToString}
                  selectedItem={toSelectedItem(harvestStatuses, field.state.value)}
                  onChange={({ selectedItem }) => field.handleChange(selectedItem?.code ?? '')}
                />
              )}
            </form.Field>
          </Column>

          <Column max={3} xlg={4} lg={6} md={4} sm={4}>
            <form.Field name="becZoneCode">
              {(field) => (
                <ComboBox
                  id="interior-bec-zone"
                  titleText="BEC zone"
                  items={[...becZones]}
                  itemToString={codeDescriptionToString}
                  selectedItem={toSelectedItem(becZones, field.state.value)}
                  onChange={({ selectedItem }) => {
                    const code = selectedItem?.code ?? '';
                    field.handleChange(code);
                    form.setFieldValue('becSubzoneVariantCode', '');
                  }}
                />
              )}
            </form.Field>
          </Column>

          <Column max={3} xlg={4} lg={5} md={4} sm={4}>
            <form.Field name="becSubzoneVariantCode">
              {(field) => (
                <ComboBox
                  id="interior-bec-subzone-variant"
                  titleText="BEC subzone/variant"
                  items={becSubzoneVariants.filter(
                    (option) => option.becZoneCode === form.state.values.becZoneCode,
                  )}
                  itemToString={codeDescriptionToString}
                  selectedItem={toSelectedItem(becSubzoneVariants, field.state.value)}
                  onChange={({ selectedItem }) => field.handleChange(selectedItem?.code ?? '')}
                  disabled={!form.state.values.becZoneCode}
                />
              )}
            </form.Field>
          </Column>

          <Column max={2} xlg={4} lg={5} md={4} sm={4}>
            <ReadonlyInput label="Benchmark zone">
              {form.state.values.benchmarkZone || undefined}
            </ReadonlyInput>
          </Column>

          <Column max={2} xlg={12} lg={6} md={4} sm={4}>
            <ReadonlyInput label="Waste benchmark (m³/ha)">
              {form.state.values.wasteBenchmark || undefined}
            </ReadonlyInput>
          </Column>

          <Column max={3} xlg={4} lg={5} md={8} sm={4}>
            <form.Field name="hasDispersedRetention">
              {(field) => (
                <Toggle
                  id="interior-dispersed-retention"
                  labelText="Is dispersed retention >= 50%?"
                  toggled={field.state.value}
                  onToggle={(toggled) => {
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

          <Column max={3} xlg={4} lg={5} md={8} sm={4}>
            <ConditionalField
              form={form as never}
              conditions={{ field: 'hasDispersedRetention', operator: 'truthy' }}
              fieldNames={['dispersedRetentionPct', 'dispersedRetentionExplanation']}
            >
              <form.Field
                name="dispersedRetentionPct"
                validators={{
                  onChangeListenTo: ['hasDispersedRetention'],
                  onChange: ({ value, fieldApi }) =>
                    validateDispersedRetentionPct(
                      value,
                      fieldApi.form.getFieldValue('hasDispersedRetention'),
                    ),
                }}
              >
                {(field) => {
                  const invalidText = fieldError(field.state.meta.errors);
                  return (
                    <TextInput
                      id="interior-dispersed-retention-percentage"
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

          <Column max={10} xlg={8} lg={6} md={8} sm={4}>
            <ConditionalField
              form={form as never}
              conditions={{ field: 'hasDispersedRetention', operator: 'truthy' }}
              fieldNames={['dispersedRetentionPct', 'dispersedRetentionExplanation']}
            >
              <form.Field
                name="dispersedRetentionExplanation"
                validators={{
                  onChangeListenTo: ['hasDispersedRetention'],
                  onChange: ({ value, fieldApi }) =>
                    validateDispersedRetentionExplanation(
                      value,
                      fieldApi.form.getFieldValue('hasDispersedRetention'),
                    ),
                }}
              >
                {(field) => {
                  const invalidText = fieldError(field.state.meta.errors);
                  return (
                    <TextArea
                      id="interior-dispersed-retention-explanation"
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

          <Column max={16} xlg={16} lg={16} md={8} sm={4}>
            <form.Field name="districtAverageCriteriaCodes">
              {(field) => (
                <ActiveMultiSelect
                  id="interior-district-average-criteria"
                  titleText="District average criteria"
                  placeholder="Select criteria"
                  items={[...districtAverageCriteria]}
                  itemToString={activeMSItemToString}
                  selectedItems={toSelectedItems(districtAverageCriteria, field.state.value)}
                  onChange={(data) => {
                    const selected = (data.selectedItems ?? []) as Array<{
                      code?: string | null;
                      value?: string;
                    }>;
                    field.handleChange(
                      selected.map((item) => item.code ?? item.value ?? '').filter(Boolean),
                    );
                  }}
                />
              )}
            </form.Field>
          </Column>
        </Grid>
      </form>

      <hr />

      <form.Field name="secondaryTimberMarks">
        {(field) => (
          <TimberMarkRepeatSection
            label="Secondary timber mark"
            addButtonLabel="Add secondary timber mark"
            idPrefix="interior-secondary-timber-mark"
            mode="form"
            marks={field.state.value}
            onChange={(marks) => field.handleChange(marks)}
          />
        )}
      </form.Field>

      <form.Field name="roadPermitTimberMarks">
        {(field) => (
          <TimberMarkRepeatSection
            label="Road permit timber mark"
            addButtonLabel="Add road permit timber mark"
            idPrefix="interior-road-permit-timber-mark"
            mode="form"
            marks={field.state.value}
            onChange={(marks) => field.handleChange(marks)}
          />
        )}
      </form.Field>
    </section>
  );
};
