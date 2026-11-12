import { Column, ComboBox, Grid } from '@carbon/react';
import { useForm } from '@tanstack/react-form';

import ReadonlyInput from '@/components/Form/ReadonlyInput';
import DispersedRetentionFields from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/DispersedRetentionFields';
import DistrictAverageCriteriaField from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/DistrictAverageCriteriaField';
import PrimaryLoggingCompleteDateField from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/PrimaryLoggingCompleteDateField';
import TimberMarkRepeatSection from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/TimberMarkRepeatSection';
import { codeDescriptionToString } from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/format';

import SubmissionDetailsHeader from './Header';
import { normalizeInitialValues, toSelectedItem } from './types';

import type { InteriorSubmissionDetailsFormProps } from './types';

type FormViewProps = Omit<InteriorSubmissionDetailsFormProps, 'mode'>;

/**
 * Editable Interior submission-details view with local form state.
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
  const form = useForm({ defaultValues: normalizeInitialValues(initialValues) });

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
          <PrimaryLoggingCompleteDateField form={form} id="interior-primary-logging-date" />

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
            <form.Subscribe selector={(state) => state.values.becZoneCode}>
              {(becZoneCode) => (
                <form.Field name="becSubzoneVariantCode">
                  {(field) => (
                    <ComboBox
                      id="interior-bec-subzone-variant"
                      titleText="BEC subzone/variant"
                      items={becSubzoneVariants.filter((option) => option.becZoneCode === becZoneCode)}
                      itemToString={codeDescriptionToString}
                      selectedItem={toSelectedItem(becSubzoneVariants, field.state.value)}
                      onChange={({ selectedItem }) => field.handleChange(selectedItem?.code ?? '')}
                      disabled={!becZoneCode}
                    />
                  )}
                </form.Field>
              )}
            </form.Subscribe>
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

          <DispersedRetentionFields
            form={form}
            toggleId="interior-dispersed-retention"
            pctId="interior-dispersed-retention-percentage"
            explanationId="interior-dispersed-retention-explanation"
          />

          <DistrictAverageCriteriaField
            form={form}
            id="interior-district-average-criteria"
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
            idPrefix="interior-secondary-timber-mark"
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
            idPrefix="interior-road-permit-timber-mark"
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
