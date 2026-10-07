import { Column, ProgressIndicator, ProgressStep } from '@carbon/react';
import { type FC } from 'react';

import type { ReportingUnitDto } from '@/services/types';

/**
 * Props for the {@link SubmissionProgress} component.
 */
interface SubmissionProgressProps {
  /** The reporting-unit details used to fill the summary card. */
  readonly data: ReportingUnitDto;
}

/** Placeholder value for summary fields with no data source yet (issues #1228/#1250). */
const PLACEHOLDER = '-';

/**
 * "Submission progress" section of the block wizard: Carbon ProgressIndicator
 * (Figma `1:7349`, first use in this app) plus the two-row summary card.
 *
 * The indicator is pinned to step 1 (`Enter details and submit`) and is not
 * interactive — later steps reflect ministry-side states that the wizard cannot
 * navigate to.
 *
 * @param props - Component props.
 * @returns The submission-progress section column.
 */
const SubmissionProgress: FC<SubmissionProgressProps> = ({ data }) => {
  const districtValue =
    data.district.code && data.district.description
      ? `${data.district.code} - ${data.district.description}`
      : (data.district.description ?? PLACEHOLDER);
  const samplingValue =
    data.sampling.code && data.sampling.description
      ? `${data.sampling.code}-${data.sampling.description}`
      : (data.sampling.description ?? PLACEHOLDER);

  const identityFields = [
    { label: 'Client name', value: data.client.description ?? PLACEHOLDER },
    { label: 'Client ID', value: data.client.code ?? PLACEHOLDER },
    { label: 'District', value: districtValue },
    { label: 'Grades', value: data.grade.description ?? PLACEHOLDER },
    { label: 'Sampling option', value: samplingValue },
  ];

  // Block-scoped fields have no data source until the block-details endpoints
  // (#1250) land; the design shows a dash placeholder in the meantime.
  const blockFields = [
    { label: 'Licence No.', value: PLACEHOLDER },
    { label: 'Cutting permit', value: PLACEHOLDER },
    { label: 'Timber mark', value: PLACEHOLDER },
    { label: 'Survey date', value: PLACEHOLDER },
    { label: 'FTA status', value: PLACEHOLDER },
    { label: 'Last updated', value: PLACEHOLDER },
  ];

  return (
    <Column
      lg={16}
      md={8}
      sm={4}
      className="block-wizard__progress"
      data-testid="block-wizard-progress"
    >
      <h2>Submission progress</h2>
      <ProgressIndicator currentIndex={0} data-testid="block-wizard-progress-indicator">
        <ProgressStep label="Enter details and submit" />
        <ProgressStep label="Ministry review" />
        <ProgressStep label="Decision" />
      </ProgressIndicator>

      <div className="block-wizard__summary-card">
        <div className="block-wizard__summary-row" data-testid="block-wizard-summary-identity">
          {identityFields.map((field) => (
            <div key={field.label} className="block-wizard__summary-field">
              <span className="block-wizard__summary-label">{field.label}</span>
              <span className="block-wizard__summary-value">{field.value}</span>
            </div>
          ))}
        </div>
        <div className="block-wizard__summary-row" data-testid="block-wizard-summary-block">
          {blockFields.map((field) => (
            <div key={field.label} className="block-wizard__summary-field">
              <span className="block-wizard__summary-label">{field.label}</span>
              <span className="block-wizard__summary-value">{field.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Column>
  );
};

export default SubmissionProgress;
