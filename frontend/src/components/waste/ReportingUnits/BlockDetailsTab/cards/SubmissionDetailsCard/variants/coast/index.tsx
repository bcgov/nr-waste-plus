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
import { type ChangeEvent, type FC } from 'react';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import ConditionalField from '@/components/Form/ConditionalField';
import TimberMarkRepeatSection from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/TimberMarkRepeatSection';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import {
  toDateValue,
  toIsoDate,
  toSelectedItem,
  codeDescriptionToString,
  toSelectedItems,
  toYesNo,
} from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/format';
import {
  validateDispersedRetentionExplanation,
  validateDispersedRetentionPct,
  validatePrimaryLoggingCompleteDate,
} from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/validation';

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
  /** Multi-select (D28). */
  readonly districtAverageCriteriaCodes: readonly string[];
  /** S6/BR-2: secondary timber marks (max 5, normalized). */
  readonly secondaryTimberMarks: readonly string[];
  /** S6/BR-2: road permit timber marks (max 5, normalized). */
  readonly roadPermitTimberMarks: readonly string[];
}

export interface CoastSubmissionDetailsFormProps {
  readonly mode: 'form' | 'read-only';
  readonly initialValues?: Partial<CoastSubmissionDetailsValues> & {
    readonly districtAverageCriteriaCode?: string;
  };
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
  districtAverageCriteriaCodes: [],
  secondaryTimberMarks: [],
  roadPermitTimberMarks: [],
};

const normalizeInitialValues = (
  initialValues?: CoastSubmissionDetailsFormProps['initialValues'],
): CoastSubmissionDetailsValues => {
  if (!initialValues) return EMPTY_VALUES;
  const legacy = initialValues.districtAverageCriteriaCode;
  const codes =
    initialValues.districtAverageCriteriaCodes ??
    (legacy ? [legacy] : EMPTY_VALUES.districtAverageCriteriaCodes);
  const { districtAverageCriteriaCode: _legacy, ...rest } = initialValues as Record<
    string,
    unknown
  >;
  return {
    ...EMPTY_VALUES,
    ...(rest as Partial<CoastSubmissionDetailsValues>),
    districtAverageCriteriaCodes: codes,
    secondaryTimberMarks: (rest.secondaryTimberMarks as string[] | undefined) ?? [],
    roadPermitTimberMarks: (rest.roadPermitTimberMarks as string[] | undefined) ?? [],
  };
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

const fieldError = (errors: readonly unknown[]): string | undefined => {
  const first = errors.find((error) => typeof error === 'string' && error.length > 0);
  return typeof first === 'string' ? first : undefined;
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
  const form = useForm({ defaultValues: normalizeInitialValues(initialValues) });
  const today = new Date();

  if (mode === 'read-only') {
    const values = normalizeInitialValues(initialValues);

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
              {toSelectedItems(districtAverageCriteria, values.districtAverageCriteriaCodes)
                .map((item) => item.description)
                .join(', ') || undefined}
            </ReadonlyInput>
          </Column>
          <Column max={16} xlg={16} lg={16} md={8} sm={4}>
            <TimberMarkRepeatSection
              label="Secondary timber mark"
              addButtonLabel="Add secondary timber mark"
              idPrefix="coast-secondary-timber-mark"
              mode="read-only"
              marks={[...values.secondaryTimberMarks]}
              onChange={() => {}}
            />
            <TimberMarkRepeatSection
              label="Road permit timber mark"
              addButtonLabel="Add road permit timber mark"
              idPrefix="coast-road-permit-timber-mark"
              mode="read-only"
              marks={[...values.roadPermitTimberMarks]}
              onChange={() => {}}
            />
          </Column>
        </Grid>
      </section>
    );
  }

  const renderAreaField = (name: AreaFieldName, disabled: boolean) => (
    <form.Field name={name}>
      {(field) => (
        <TextInput
          id={`coast-${name}`}
          labelText={AREA_FIELD_LABELS[name]}
          type="number"
          step="0.001"
          min="0"
          value={field.state.value}
          disabled={disabled}
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
                    value={toDateValue(field.state.value)}
                    onChange={([date]) => {
                      if (date) {
                        field.handleChange(toIsoDate(date));
                      } else {
                        field.handleChange('');
                      }
                    }}
                  >
                    <DatePickerInput
                      id="coast-primary-logging-date"
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
                  id="coast-harvest-status"
                  titleText="Harvest status"
                  items={[...harvestStatuses]}
                  itemToString={codeDescriptionToString}
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
                  itemToString={codeDescriptionToString}
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
                  onToggle={(toggled) => {
                    field.handleChange(toggled);
                    if (toggled) {
                      form.setFieldValue('cableYardingAreaHa', '');
                      form.setFieldValue('groundBasedAreaHa', '');
                      form.setFieldValue('skylineLoggingAreaHa', '');
                    }
                  }}
                  labelA="No"
                  labelB="Yes"
                />
              )}
            </form.Field>
          </Column>

          <form.Subscribe selector={(state) => state.values.isHeliLogging}>
            {(isHeliLogging) =>
              AREA_FIELD_NAMES.map((name) => (
                <Column key={name} max={2} xlg={3} lg={4} md={4} sm={4}>
                  {renderAreaField(name, isHeliLogging)}
                </Column>
              ))
            }
          </form.Subscribe>

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
              unregisterOnHide={false}
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
                      id="coast-dispersed-retention-percentage"
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
              unregisterOnHide={false}
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
                      id="coast-dispersed-retention-explanation"
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
                  id="coast-district-average-criteria"
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
            idPrefix="coast-secondary-timber-mark"
            mode="form"
            marks={field.state.value}
            onChange={(marks) => field.handleChange(marks)}
            onAdd={onAddSecondaryTimberMark}
          />
        )}
      </form.Field>

      <form.Field name="roadPermitTimberMarks">
        {(field) => (
          <TimberMarkRepeatSection
            label="Road permit timber mark"
            addButtonLabel="Add road permit timber mark"
            idPrefix="coast-road-permit-timber-mark"
            mode="form"
            marks={field.state.value}
            onChange={(marks) => field.handleChange(marks)}
            onAdd={onAddRoadPermitTimberMark}
          />
        )}
      </form.Field>
    </section>
  );
};

export default CoastSubmissionDetailsForm;
