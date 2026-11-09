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
import { type ChangeEvent, type FC } from 'react';

import ConditionalField from '@/components/Form/ConditionalField';
import ReadonlyInput from '@/components/Form/ReadonlyInput';

import type { CodeDescriptionDto } from '@/types/search.types';

import './index.scss';

export interface CoastSubmissionDetailsValues {
  readonly primaryLoggingCompleteDate: string;
  readonly harvestStatusCode: string;
  readonly maturityCode: string;
  readonly isHeliLogging: boolean;
  readonly cableYardingAreaHa: string;
  readonly groundBasedAreaHa: string;
  readonly skylineLoggingAreaHa: string;
  readonly wasteBenchmark: string;
  readonly hasDispersedRetention: boolean;
  readonly dispersedRetentionPct: string;
  readonly dispersedRetentionExplanation: string;
  readonly districtAverageCriteriaCode: string;
}

export interface CoastSubmissionDetailsFormProps {
  readonly mode: 'form' | 'read-only';
  readonly initialValues?: Partial<CoastSubmissionDetailsValues>;
  readonly harvestStatuses: readonly CodeDescriptionDto[];
  readonly maturityOptions: readonly CodeDescriptionDto[];
  readonly districtAverageCriteria: readonly CodeDescriptionDto[];
  readonly onAddSecondaryTimberMark?: () => void;
  readonly onAddRoadPermitTimberMark?: () => void;
}

const EMPTY_VALUES: CoastSubmissionDetailsValues = {
  primaryLoggingCompleteDate: '',
  harvestStatusCode: '',
  maturityCode: '',
  isHeliLogging: false,
  cableYardingAreaHa: '',
  groundBasedAreaHa: '',
  skylineLoggingAreaHa: '',
  wasteBenchmark: '',
  hasDispersedRetention: false,
  dispersedRetentionPct: '',
  dispersedRetentionExplanation: '',
  districtAverageCriteriaCode: '',
};

/** Area fields share the 3-decimal entry rule (product decision D15, `numeric(12,3)` columns). */
const THREE_DECIMAL_PATTERN = /^\d*(?:\.\d{0,3})?$/;

const AREA_FIELD_LABELS = {
  cableYardingAreaHa: 'Cable yarding (ha)',
  groundBasedAreaHa: 'Ground based (ha)',
  skylineLoggingAreaHa: 'Skyline logging (ha)',
} as const;

type AreaFieldName = keyof typeof AREA_FIELD_LABELS;

const AREA_FIELD_NAMES = Object.keys(AREA_FIELD_LABELS) as AreaFieldName[];

const toSelectedItem = (
  options: readonly CodeDescriptionDto[],
  code: string,
): CodeDescriptionDto | null => options.find((option) => option.code === code) ?? null;

const toYesNo = (value: boolean): string => (value ? 'Yes' : 'No');

const toDateValue = (isoDate: string): Date[] => (isoDate ? [new Date(`${isoDate}T00:00:00`)] : []);

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Coast District Average submission-details fields with local form state.
 *
 * Option lists and read-only values are supplied by the containing page so this
 * component does not assume an API contract or maintain a duplicate code list.
 * Numeric harvest-area fields clamp entry to three decimals (D15).
 *
 * @param props - Mode, initial data, option lists, and local-change callbacks.
 * @returns The Coast submission-details form or read-only view.
 */
const CoastSubmissionDetailsForm: FC<CoastSubmissionDetailsFormProps> = ({
  mode,
  initialValues,
  harvestStatuses,
  maturityOptions,
  districtAverageCriteria,
  onAddSecondaryTimberMark,
  onAddRoadPermitTimberMark,
}) => {
  const form = useForm({ defaultValues: { ...EMPTY_VALUES, ...initialValues } });

  if (mode === 'read-only') {
    const values = { ...EMPTY_VALUES, ...form.state.values };

    return (
      <section className="coast-submission-details" aria-labelledby="coast-submission-heading">
        <h2 id="coast-submission-heading">Submission details</h2>
        <p>Complete all fields and click Save before leaving this tab</p>
        <Grid className="coast-submission-details__summary-grid">
          <Column
            className="coast-submission-details__summary-column"
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
            className="coast-submission-details__summary-column"
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
            className="coast-submission-details__summary-column"
            max={2}
            xlg={2}
            lg={2}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="Maturity">
              {toSelectedItem(maturityOptions, values.maturityCode)?.description}
            </ReadonlyInput>
          </Column>
          <Column
            className="coast-submission-details__summary-column"
            max={2}
            xlg={2}
            lg={2}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="Heli logging">{toYesNo(values.isHeliLogging)}</ReadonlyInput>
          </Column>
          <Column
            className="coast-submission-details__summary-column"
            max={2}
            xlg={2}
            lg={2}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="Cable yarding (ha)">{values.cableYardingAreaHa}</ReadonlyInput>
          </Column>
          <Column
            className="coast-submission-details__summary-column"
            max={2}
            xlg={2}
            lg={2}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="Ground based (ha)">{values.groundBasedAreaHa}</ReadonlyInput>
          </Column>
          <Column
            className="coast-submission-details__summary-column"
            max={2}
            xlg={2}
            lg={2}
            md={4}
            sm={4}
          >
            <ReadonlyInput label="Skyline logging (ha)">
              {values.skylineLoggingAreaHa}
            </ReadonlyInput>
          </Column>
          <Column
            className="coast-submission-details__summary-column"
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
        <Grid className="coast-submission-details__details-grid">
          <Column max={16} xlg={16} lg={16} md={8} sm={4}>
            <ReadonlyInput label="Is dispersed retention >= 50%?">
              {toYesNo(values.hasDispersedRetention)}
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

  const renderAreaField = (name: AreaFieldName) => (
    <form.Field name={name}>
      {(field) => (
        <TextInput
          id={`coast-${name}`}
          labelText={AREA_FIELD_LABELS[name]}
          type="number"
          step="0.001"
          min="0"
          value={field.state.value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const next = event.currentTarget.value;
            if (THREE_DECIMAL_PATTERN.test(next)) {
              field.handleChange(next);
            }
          }}
        />
      )}
    </form.Field>
  );

  return (
    <section className="coast-submission-details" aria-labelledby="coast-submission-heading">
      <form aria-label="Coast submission details" onSubmit={(event) => event.preventDefault()}>
        <h2 id="coast-submission-heading">Submission details</h2>
        <p>Complete all fields and click Save before leaving this tab</p>
        <Grid className="coast-submission-details__details-grid">
          <Column max={3} xlg={4} lg={5} md={4} sm={4}>
            <form.Field name="primaryLoggingCompleteDate">
              {(field) => (
                <DatePicker
                  datePickerType="single"
                  dateFormat="m/d/Y"
                  allowInput
                  value={toDateValue(field.state.value)}
                  onChange={([date]) => {
                    if (date) {
                      field.handleChange(toIsoDate(date));
                    }
                  }}
                >
                  <DatePickerInput
                    id="coast-primary-logging-date"
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
                  id="coast-harvest-status"
                  titleText="Harvest status"
                  items={[...harvestStatuses]}
                  itemToString={(item) => item?.description ?? ''}
                  selectedItem={toSelectedItem(harvestStatuses, field.state.value)}
                  onChange={({ selectedItem }) => field.handleChange(selectedItem?.code ?? '')}
                />
              )}
            </form.Field>
          </Column>

          <Column max={3} xlg={4} lg={5} md={4} sm={4}>
            <form.Field name="maturityCode">
              {(field) => (
                <ComboBox
                  id="coast-maturity"
                  titleText="Maturity"
                  items={[...maturityOptions]}
                  itemToString={(item) => item?.description ?? ''}
                  selectedItem={toSelectedItem(maturityOptions, field.state.value)}
                  onChange={({ selectedItem }) => field.handleChange(selectedItem?.code ?? '')}
                />
              )}
            </form.Field>
          </Column>

          <Column max={3} xlg={4} lg={5} md={4} sm={4}>
            <form.Field name="isHeliLogging">
              {(field) => (
                <Toggle
                  id="coast-heli-logging"
                  labelText="Heli logging"
                  toggled={field.state.value}
                  onToggle={field.handleChange}
                  labelA="No"
                  labelB="Yes"
                />
              )}
            </form.Field>
          </Column>

          {AREA_FIELD_NAMES.map((name) => (
            <Column key={name} max={2} xlg={3} lg={4} md={4} sm={4}>
              {renderAreaField(name)}
            </Column>
          ))}

          <Column max={2} xlg={3} lg={4} md={4} sm={4}>
            <ReadonlyInput label="Waste benchmark (m³/ha)">
              {form.state.values.wasteBenchmark || undefined}
            </ReadonlyInput>
          </Column>

          <Column max={3} xlg={4} lg={5} md={8} sm={4}>
            <form.Field name="hasDispersedRetention">
              {(field) => (
                <Toggle
                  id="coast-dispersed-retention"
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
                    id="coast-dispersed-retention-percentage"
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
                    id="coast-dispersed-retention-explanation"
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
                  id="coast-district-average-criteria"
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

export default CoastSubmissionDetailsForm;
