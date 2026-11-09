import {
  Button,
  Column,
  ComboBox,
  DatePicker,
  DatePickerInput,
  Grid,
  TextArea,
  TextInput,
  Toggle,
} from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useForm } from '@tanstack/react-form';
import { type ChangeEvent } from 'react';

import ConditionalField from '@/components/Form/ConditionalField';
import ReadonlyInput from '@/components/Form/ReadonlyInput';

import SubmissionDetailsHeader from './Header';
import { EMPTY_VALUES, toSelectedItem } from './types';

import type { InteriorSubmissionDetailsFormProps } from './types';

type FormViewProps = Omit<InteriorSubmissionDetailsFormProps, 'mode'>;

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
  onAddSecondaryTimberMark,
  onAddRoadPermitTimberMark,
}: FormViewProps) => {
  const form = useForm({ defaultValues: { ...EMPTY_VALUES, ...initialValues } });

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
            <form.Field name="primaryLoggingCompleteDate">
              {(field) => (
                <DatePicker
                  datePickerType="single"
                  dateFormat="m/d/Y"
                  allowInput
                  value={field.state.value ? [new Date(`${field.state.value}T00:00:00`)] : []}
                  onChange={([date]) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      field.handleChange(`${year}-${month}-${day}`);
                    }
                  }}
                >
                  <DatePickerInput
                    id="interior-primary-logging-date"
                    labelText="Primary logging complete"
                    placeholder="mm/dd/yyyy"
                    onBlur={field.handleBlur}
                  />
                </DatePicker>
              )}
            </form.Field>
          </Column>

          <Column max={3} xlg={4} lg={5} md={4} sm={4}>
            <form.Field name="harvestStatusCode">
              {(field) => (
                <ComboBox
                  id="interior-harvest-status"
                  titleText="Harvest status"
                  items={[...harvestStatuses]}
                  itemToString={(item) => item?.description ?? ''}
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
                  itemToString={(item) => item?.description ?? ''}
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
                  itemToString={(item) => item?.description ?? ''}
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
                  onToggle={field.handleChange}
                  labelA="No"
                  labelB="Yes"
                />
              )}
            </form.Field>
          </Column>

          <Column max={3} xlg={4} lg={5} md={8} sm={4}>
            <ConditionalField
              form={form}
              conditions={{ field: 'hasDispersedRetention', operator: 'truthy' }}
              fieldNames={['dispersedRetentionPct', 'dispersedRetentionExplanation']}
            >
              <form.Field name="dispersedRetentionPct">
                {(field) => (
                  <TextInput
                    id="interior-dispersed-retention-percentage"
                    labelText="Dispersed retention percentage"
                    type="number"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.currentTarget.value)}
                  />
                )}
              </form.Field>
            </ConditionalField>
          </Column>

          <Column max={10} xlg={8} lg={6} md={8} sm={4}>
            <ConditionalField
              form={form}
              conditions={{ field: 'hasDispersedRetention', operator: 'truthy' }}
              fieldNames={['dispersedRetentionPct', 'dispersedRetentionExplanation']}
            >
              <form.Field name="dispersedRetentionExplanation">
                {(field) => (
                  <TextArea
                    id="interior-dispersed-retention-explanation"
                    labelText="Explain how retention percentage was calculated"
                    rows={3}
                    value={field.state.value}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      field.handleChange(event.currentTarget.value)
                    }
                  />
                )}
              </form.Field>
            </ConditionalField>
          </Column>

          <Column max={16} xlg={16} lg={16} md={8} sm={4}>
            <form.Field name="districtAverageCriteriaCode">
              {(field) => (
                <ComboBox
                  id="interior-district-average-criteria"
                  titleText="District average criteria"
                  helperText="Select the district average criteria that applies to this submission"
                  items={[...districtAverageCriteria]}
                  itemToString={(item) => item?.description ?? ''}
                  selectedItem={toSelectedItem(districtAverageCriteria, field.state.value)}
                  onChange={({ selectedItem }) => field.handleChange(selectedItem?.code ?? '')}
                />
              )}
            </form.Field>
          </Column>
        </Grid>
      </form>

      <hr />

      <Button kind="ghost" onClick={onAddSecondaryTimberMark} renderIcon={Add}>
        Add secondary timber mark
      </Button>

      <Button kind="ghost" onClick={onAddRoadPermitTimberMark} renderIcon={Add}>
        Add road permit timber mark
      </Button>
    </section>
  );
};
