import { Column, Grid } from '@carbon/react';

import ReadonlyInput from '@/components/Form/ReadonlyInput';
import TimberMarkRepeatSection from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/TimberMarkRepeatSection';
import {
  toSelectedItem,
  toSelectedItems,
  toYesNo,
} from '@/components/waste/ReportingUnits/BlockDetailsTab/cards/SubmissionDetailsCard/shared/format';

import { normalizeInitialValues } from './types';

import type { CoastSubmissionDetailsReadOnlyProps } from './types';

export const CoastSubmissionDetailsReadOnly = ({
  initialValues,
  harvestStatuses,
  maturityOptions,
  districtAverageCriteria,
}: CoastSubmissionDetailsReadOnlyProps) => {
  const values = normalizeInitialValues(initialValues);

  return (
    <section className="coast-submission-details" aria-labelledby="coast-submission-heading">
      <h2 id="coast-submission-heading">Submission details</h2>
      <p>Complete all fields and click Save before leaving this tab</p>
      <Grid className="coast-submission-details__summary-grid">
        <Column className="coast-submission-details__summary-column" max={3} xlg={3} lg={3} md={4} sm={4}>
          <ReadonlyInput label="Primary logging complete">{values.primaryLoggingCompleteDate}</ReadonlyInput>
        </Column>
        <Column className="coast-submission-details__summary-column" max={3} xlg={3} lg={3} md={4} sm={4}>
          <ReadonlyInput label="Harvest status">
            {toSelectedItem(harvestStatuses, values.harvestStatusCode)?.description}
          </ReadonlyInput>
        </Column>
        <Column className="coast-submission-details__summary-column" max={2} xlg={2} lg={2} md={4} sm={4}>
          <ReadonlyInput label="Maturity">
            {toSelectedItem(maturityOptions, values.maturityCode)?.description}
          </ReadonlyInput>
        </Column>
        <Column className="coast-submission-details__summary-column" max={2} xlg={2} lg={2} md={4} sm={4}>
          <ReadonlyInput label="Heli logging">{toYesNo(values.isHeliLogging)}</ReadonlyInput>
        </Column>
        <Column className="coast-submission-details__summary-column" max={2} xlg={2} lg={2} md={4} sm={4}>
          <ReadonlyInput label="Cable yarding (ha)">{values.cableYardingAreaHa}</ReadonlyInput>
        </Column>
        <Column className="coast-submission-details__summary-column" max={2} xlg={2} lg={2} md={4} sm={4}>
          <ReadonlyInput label="Ground based (ha)">{values.groundBasedAreaHa}</ReadonlyInput>
        </Column>
        <Column className="coast-submission-details__summary-column" max={2} xlg={2} lg={2} md={4} sm={4}>
          <ReadonlyInput label="Skyline logging (ha)">{values.skylineLoggingAreaHa}</ReadonlyInput>
        </Column>
        <Column className="coast-submission-details__summary-column" max={3} xlg={3} lg={3} md={4} sm={4}>
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
};
