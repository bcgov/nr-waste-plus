import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

  it('navigates to attachments from additional requirements (S8)', async () => {
    const onNavigateTab = vi.fn();
    await renderWithAppAsync(
      <BlockDetailsTab {...baseProps} variant="interior" onNavigateTab={onNavigateTab} />,
    );

    await screen.findByRole('button', { name: 'Add attachments' });
    screen.getByRole('button', { name: 'Add attachments' }).click();
    expect(onNavigateTab).toHaveBeenCalledWith(3);
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

describe('tab-tier cards (S7/S8)', () => {
  it('renders S7 summary cards and S8 additional requirements content', async () => {
    render(<WasteAssessmentAreaSummaryCard />);
    expect(screen.getByRole('heading', { name: 'Waste assessment area summary' })).toBeTruthy();

    render(<DistrictAverageVolumesSummaryCard />);
    expect(screen.getByRole('heading', { name: 'District average volumes summary' })).toBeTruthy();

    await renderWithAppAsync(<AdditionalRequirementsCard mode="read-only" />);
    expect(screen.getByRole('heading', { name: 'Additional requirements' })).toBeTruthy();
  });

  it('navigates to area calculator and volume details via S7 actions', async () => {
    const user = userEvent.setup();
    const onNavigateTab = vi.fn();
    await renderWithAppAsync(
      <BlockDetailsTab {...baseProps} variant="interior" onNavigateTab={onNavigateTab} />,
    );

    await user.click(screen.getByRole('button', { name: 'Go to area calculator' }));
    await user.click(screen.getByRole('button', { name: 'View volume details' }));
    expect(onNavigateTab).toHaveBeenCalledWith(1);
    expect(onNavigateTab).toHaveBeenCalledWith(2);
  });
});
