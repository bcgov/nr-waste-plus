import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SubmissionProgress from './SubmissionProgress';

import type { ReportingUnitDto } from '@/services/types';

const reportingUnit: ReportingUnitDto = {
  id: 468,
  client: { code: '00002022', description: 'Forest client' },
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'IN', description: 'Interior' },
  sampling: { code: 'AVG', description: 'District Average' },
  district: { code: 'DKM', description: 'Coast Mountains' },
};

describe('SubmissionProgress', () => {
  it('shouldRenderProgressMilestonesAndCompleteIdentitySummary', () => {
    render(<SubmissionProgress data={reportingUnit} />);

    expect(screen.getByRole('heading', { name: 'Submission progress' })).toBeTruthy();
    expect(screen.getByText('Enter details and submit')).toBeTruthy();
    expect(screen.getByText('Ministry review')).toBeTruthy();
    expect(screen.getByText('Decision')).toBeTruthy();
    expect(screen.getByTestId('block-wizard-summary-identity').textContent).toContain(
      'DKM - Coast Mountains',
    );
    expect(screen.getByTestId('block-wizard-summary-identity').textContent).toContain(
      'AVG-District Average',
    );
  });

  it.each([
    { district: { code: null, description: 'Coast Mountains' }, expected: 'Coast Mountains' },
    { district: { code: 'DKM', description: null }, expected: '-' },
    { district: { code: null, description: null }, expected: '-' },
  ])('shouldRenderDistrictFallback_whenCodeOrDescriptionIsMissing', ({ district, expected }) => {
    render(<SubmissionProgress data={{ ...reportingUnit, district }} />);

    expect(screen.getByTestId('block-wizard-summary-identity').textContent).toContain(expected);
  });

  it.each([
    { sampling: { code: null, description: 'District Average' }, expected: 'District Average' },
    { sampling: { code: 'AVG', description: null }, expected: '-' },
    { sampling: { code: null, description: null }, expected: '-' },
  ])('shouldRenderSamplingFallback_whenCodeOrDescriptionIsMissing', ({ sampling, expected }) => {
    render(<SubmissionProgress data={{ ...reportingUnit, sampling }} />);

    expect(screen.getByTestId('block-wizard-summary-identity').textContent).toContain(expected);
  });

  it('shouldRenderPlaceholdersForMissingClientAndGradeData', () => {
    render(
      <SubmissionProgress
        data={{
          ...reportingUnit,
          client: { code: null, description: null },
          grade: { code: null, description: null },
        }}
      />,
    );

    const identity = screen.getByTestId('block-wizard-summary-identity').textContent;
    expect(identity).toContain('Client name-');
    expect(identity).toContain('Client ID-');
    expect(identity).toContain('Grades-');
  });

  it('shouldRenderPlaceholdersForBlockFieldsWithoutBlockData', () => {
    render(<SubmissionProgress data={reportingUnit} />);

    const blockSummary = screen.getByTestId('block-wizard-summary-block').textContent;
    expect(blockSummary?.match(/-/g)).toHaveLength(6);
    expect(blockSummary).toContain('Licence No.');
    expect(blockSummary).toContain('Last updated');
  });
});
