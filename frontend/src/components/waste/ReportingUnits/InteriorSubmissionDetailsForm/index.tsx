import {
  Button,
  Column,
  ComboBox,
  DatePicker,
  DatePickerInput,
  Grid,
  TextInput,
  Toggle,
} from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useForm } from '@tanstack/react-form';
import { type FC } from 'react';

import ConditionalField from '@/components/Form/ConditionalField';
import ReadonlyInput from '@/components/Form/ReadonlyInput';

import type { CodeDescriptionDto } from '@/types/search.types';

import './index.scss';

export interface InteriorSubmissionDetailsValues {
  readonly primaryLoggingCompleteDate: string;
  readonly harvestStatusCode: string;
  readonly becZoneCode: string;
  readonly becSubzoneVariantCode: string;
  readonly benchmarkZone: string;
  readonly wasteBenchmark: string;
  readonly hasDispersedRetention: boolean;
  readonly dispersedRetentionPct: string;
  readonly dispersedRetentionExplanation: string;
  readonly districtAverageCriteriaCode: string;
}

export interface InteriorBecSubzoneVariantOption extends CodeDescriptionDto {
  readonly becZoneCode: string;
}

export interface InteriorSubmissionDetailsFormProps {
  readonly mode: 'form' | 'read-only';
  readonly initialValues?: Partial<InteriorSubmissionDetailsValues>;
  readonly harvestStatuses: readonly CodeDescriptionDto[];
  readonly becZones: readonly CodeDescriptionDto[];
  readonly becSubzoneVariants: readonly InteriorBecSubzoneVariantOption[];
  readonly districtAverageCriteria: readonly CodeDescriptionDto[];
  readonly onAddSecondaryTimberMark?: () => void;
  readonly onAddRoadPermitTimberMark?: () => void;
}

const EMPTY_VALUES: InteriorSubmissionDetailsValues = {
  primaryLoggingCompleteDate: '',
  harvestStatusCode: '',
  becZoneCode: '',
  becSubzoneVariantCode: '',
  benchmarkZone: '',
  wasteBenchmark: '',
  hasDispersedRetention: false,
  dispersedRetentionPct: '',
  dispersedRetentionExplanation: '',
  districtAverageCriteriaCode: '',
};

const toSelectedItem = (
  options: readonly CodeDescriptionDto[],
  code: string,
): CodeDescriptionDto | null => options.find((option) => option.code === code) ?? null;

/**
 * Interior District Average submission-details fields with local form state.
 *
 * Option lists and read-only values are supplied by the containing page so this
 * component does not assume an API contract or maintain a duplicate code list.
 *
 * @param props - Mode, initial data, option lists, and local-change callbacks.
 * @returns The Interior submission-details form or read-only view.
 */
const InteriorSubmissionDetailsForm: FC<InteriorSubmissionDetailsFormProps> = ({
  mode,
  initialValues,
  harvestStatuses,
  becZones,
  becSubzoneVariants,
  districtAverageCriteria,
  onAddSecondaryTimberMark,
  onAddRoadPermitTimberMark,
}) => {
  const form = useForm({ defaultValues: { ...EMPTY_VALUES, ...initialValues } });

  if (mode === 'read-only') {
    const values = { ...EMPTY_VALUES, ...form.state.values };

    return (
      <section
        className="interior-submission-details"
        aria-labelledby="interior-submission-heading"
      >
        <h2 id="interior-submission-heading">Submission details</h2>
        <p>Complete all fields and click Save before leaving this tab</p>
        <Grid className="interior-submission-details__summary-grid">
          <Column
            className="interior-submission-details__summary-column"
            max={3}
            xlg={3}
            lg={3}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="Primary logging complete">
              {values.primaryLoggingCompleteDate}
            </ReadonlyInput>
          </Column>
          <Column
            className="interior-submission-details__summary-column"
            max={3}
            xlg={3}
            lg={3}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="Harvest status">
              {toSelectedItem(harvestStatuses, values.harvestStatusCode)?.description}
            </ReadonlyInput>
          </Column>
          <Column
            className="interior-submission-details__summary-column"
            max={3}
            xlg={3}
            lg={3}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="BEC zone">
              {toSelectedItem(becZones, values.becZoneCode)?.description}
            </ReadonlyInput>
          </Column>
          <Column
            className="interior-submission-details__summary-column"
            max={2}
            xlg={2}
            lg={2}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="BEC subzone/variant">
              {toSelectedItem(becSubzoneVariants, values.becSubzoneVariantCode)?.description}
            </ReadonlyInput>
          </Column>
          <Column
            className="interior-submission-details__summary-column"
            max={2}
            xlg={2}
            lg={2}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="Benchmark zone">
              {values.benchmarkZone || undefined}
            </ReadonlyInput>
          </Column>
          <Column
            className="interior-submission-details__summary-column"
            max={3}
            xlg={3}
            lg={3}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="Waste benchmark (m³/ha)">
              {values.wasteBenchmark || undefined}
            </ReadonlyInput>
          </Column>
        </Grid>
        <Grid className="interior-submission-details__details-grid">
          <Column max={16} xlg={16} lg={16} md={8} sm={4}>
            <ReadonlyInput label="Is dispersed retention >= 50%?">
              {values.hasDispersedRetention ? 'Yes' : 'No'}
            </ReadonlyInput>
          </Column>
          {values.hasDispersedRetention && (
            <>
              <Column max={8} xlg={8} lg={8} md={4} sm={4}>
                <ReadonlyInput label="Dispersed retention percentage">
                  {values.dispersedRetentionPct}
                </ReadonlyInput>
              </Column>
              <Column max={8} xlg={8} lg={8} md={4} sm={4}>
                <ReadonlyInput label="Explain how retention percentage was calculated">
                  {values.dispersedRetentionExplanation}
                </ReadonlyInput>
              </Column>
            </>
          )}
          <Column max={16} xlg={16} lg={16} md={8} sm={4}>
            <ReadonlyInput label="District average criteria">
              {
                toSelectedItem(districtAverageCriteria, values.districtAverageCriteriaCode)
                  ?.description
              }
            </ReadonlyInput>
          </Column>
        </Grid>
      </section>
    );
  }

  return (
    <section className="interior-submission-details" aria-labelledby="interior-submission-heading">
      <form
        aria-label="Interior submission details"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <h2 id="interior-submission-heading">Submission Details</h2>
        <p>Complete all fields and click Save before leaving this tab</p>
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
                  <TextInput
                    id="interior-dispersed-retention-explanation"
                    labelText="Explain how retention percentage was calculated"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.currentTarget.value)}
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

export default InteriorSubmissionDetailsForm;
