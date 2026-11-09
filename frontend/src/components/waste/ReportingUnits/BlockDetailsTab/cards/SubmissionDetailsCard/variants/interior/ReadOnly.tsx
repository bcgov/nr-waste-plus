import { Column, Grid } from '@carbon/react';

import ReadonlyInput from '@/components/Form/ReadonlyInput';
import { toSelectedItems } from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/format';

import SubmissionDetailsHeader from './Header';
import { normalizeInitialValues, toSelectedItem } from './types';

import type { InteriorSubmissionDetailsReadOnlyProps } from './types';

/**
 * Read-only Interior submission-details view: renders the supplied values
 * through {@link ReadonlyInput} with no edit affordances and no form state.
 *
 * @param props - Seed data and the option lists used to resolve descriptions.
 * @returns The Interior submission-details read-only view.
 */
export const InteriorSubmissionDetailsReadOnly = ({
  initialValues,
  harvestStatuses,
  becZones,
  becSubzoneVariants,
  districtAverageCriteria,
}: InteriorSubmissionDetailsReadOnlyProps) => {
  const values = normalizeInitialValues(initialValues);
  const criteriaText = toSelectedItems(districtAverageCriteria, values.districtAverageCriteriaCodes)
    .map((item) => item.description)
    .join(', ');

  return (
    <section className="interior-submission-details" aria-labelledby="interior-submission-heading">
      <SubmissionDetailsHeader />
      <Grid className="interior-submission-details__summary-grid">
        <Column
          className="interior-submission-details__summary-column"
          max={3}
          xlg={4}
          lg={5}
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
          xlg={4}
          lg={5}
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
          xlg={4}
          lg={6}
          md={4}
          sm={4}
        >
          <ReadonlyInput label="BEC zone">
            {toSelectedItem(becZones, values.becZoneCode)?.description}
          </ReadonlyInput>
        </Column>
        <Column
          className="interior-submission-details__summary-column"
          max={3}
          xlg={4}
          lg={5}
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
          xlg={4}
          lg={5}
          md={4}
          sm={4}
        >
          <ReadonlyInput label="Benchmark zone">{values.benchmarkZone || undefined}</ReadonlyInput>
        </Column>
        <Column
          className="interior-submission-details__summary-column"
          max={2}
          xlg={12}
          lg={6}
          md={4}
          sm={4}
        >
          <ReadonlyInput label="Waste benchmark (m³/ha)">
            {values.wasteBenchmark || undefined}
          </ReadonlyInput>
        </Column>
      </Grid>
      <Grid className="interior-submission-details__details-grid">
        <Column max={3} xlg={4} lg={5} md={8} sm={4}>
          <ReadonlyInput label="Is dispersed retention >= 50%?">
            {values.hasDispersedRetention ? 'Yes' : 'No'}
          </ReadonlyInput>
        </Column>
        {values.hasDispersedRetention && (
          <>
            <Column max={3} xlg={4} lg={5} md={8} sm={4}>
              <ReadonlyInput label="Dispersed retention percentage">
                {values.dispersedRetentionPct}
              </ReadonlyInput>
            </Column>
            <Column max={10} xlg={8} lg={6} md={8} sm={4}>
              <ReadonlyInput label="Explain how retention percentage was calculated">
                {values.dispersedRetentionExplanation}
              </ReadonlyInput>
            </Column>
          </>
        )}
        <Column max={16} xlg={16} lg={16} md={8} sm={4}>
          <ReadonlyInput label="District average criteria">
            {criteriaText || undefined}
          </ReadonlyInput>
        </Column>
      </Grid>
    </section>
  );
};
