import { Column, ComboBox, Grid, TextInput, Toggle } from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import type { ChangeEvent } from 'react';

import ReadonlyInput from '@/components/Form/ReadonlyInput';
import DispersedRetentionFields from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/DispersedRetentionFields';
import DistrictAverageCriteriaField from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/DistrictAverageCriteriaField';
import PrimaryLoggingCompleteDateField from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/PrimaryLoggingCompleteDateField';
import TimberMarkRepeatSection from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/TimberMarkRepeatSection';
import { codeDescriptionToString, toSelectedItem } from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/format';

import { normalizeInitialValues } from './types';

import type { CoastSubmissionDetailsFormProps } from './types';

type FormViewProps = Omit<CoastSubmissionDetailsFormProps, 'mode'>;

const THREE_DECIMAL_PATTERN = /^\d*(?:\.\d{0,3})?$/;

const AREA_FIELD_LABELS = {
  cableYardingAreaHa: 'Cable yarding (ha)',
  groundBasedAreaHa: 'Ground based (ha)',
  skylineLoggingAreaHa: 'Skyline logging (ha)',
} as const;

type AreaFieldName = keyof typeof AREA_FIELD_LABELS;
const AREA_FIELD_NAMES = Object.keys(AREA_FIELD_LABELS) as AreaFieldName[];

export const CoastSubmissionDetailsFormView = ({
  initialValues,
  harvestStatuses,
  maturityOptions,
  districtAverageCriteria,
  onAddSecondaryTimberMark,
  onAddRoadPermitTimberMark,
}: FormViewProps) => {
  const form = useForm({ defaultValues: normalizeInitialValues(initialValues) });

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
          <PrimaryLoggingCompleteDateField form={form} id="coast-primary-logging-date" />

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

          <DispersedRetentionFields
            form={form}
            toggleId="coast-dispersed-retention"
            pctId="coast-dispersed-retention-percentage"
            explanationId="coast-dispersed-retention-explanation"
          />

          <DistrictAverageCriteriaField
            form={form}
            id="coast-district-average-criteria"
            options={districtAverageCriteria}
          />
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
