import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

import BlockDetailsTab, { resolveSubmissionVariant } from './index';
import SubmissionDetailsCard from './cards/SubmissionDetailsCard';
import AdditionalRequirementsCard from './cards/AdditionalRequirementsCard';
import DistrictAverageVolumesSummaryCard from './cards/DistrictAverageVolumesSummaryCard';
import WasteAssessmentAreaSummaryCard from './cards/WasteAssessmentAreaSummaryCard';

const baseProps = {
  mode: 'form' as const,
  harvestStatuses: [],
  becZones: [],
  becSubzoneVariants: [],
  maturityOptions: [],
  districtAverageCriteria: [],
};

describe('BlockDetailsTab (D20/S3b)', () => {
  it('resolves the variant and renders the submission details card', async () => {
    await renderWithAppAsync(
      <BlockDetailsTab {...baseProps} grade={{ code: 'C', description: 'Coast' }} />,
    );

    expect(screen.getByRole('combobox', { name: 'Maturity' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'BEC zone' })).toBeNull();
  });

  it('accepts an explicit variant override', async () => {
    await renderWithAppAsync(
      <BlockDetailsTab
        {...baseProps}
        variant="interior"
        grade={{ code: 'C', description: 'Coast' }}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'BEC zone' })).toBeTruthy();
  });

  it('re-exports resolveSubmissionVariant', () => {
    expect(resolveSubmissionVariant({ code: 'I', description: 'Interior' })).toBe('interior');
  });
});

describe('SubmissionDetailsCard', () => {
  it('renders the coast variant', async () => {
    await renderWithAppAsync(<SubmissionDetailsCard {...baseProps} variant="coast" />);
    expect(screen.getByRole('combobox', { name: 'Maturity' })).toBeTruthy();
  });

  it('renders the interior variant', async () => {
    await renderWithAppAsync(<SubmissionDetailsCard {...baseProps} variant="interior" />);
    expect(screen.getByRole('combobox', { name: 'BEC zone' })).toBeTruthy();
  });
});

describe('tab-tier card placeholders (S7/S8)', () => {
  it('render without content until implemented', () => {
    expect(WasteAssessmentAreaSummaryCard({})).toBeNull();
    expect(DistrictAverageVolumesSummaryCard({})).toBeNull();
    expect(AdditionalRequirementsCard({})).toBeNull();
  });
});
