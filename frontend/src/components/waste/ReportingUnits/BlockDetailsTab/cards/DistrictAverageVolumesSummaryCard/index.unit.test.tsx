import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DistrictAverageVolumesSummaryCard from './index';

const options = [{ code: 'C', description: 'C - Any combination', areas: null }];

describe('DistrictAverageVolumesSummaryCard (S7)', () => {
  it('renders 8 columns, fixed values, totals, and navigates to volume details', async () => {
    const user = userEvent.setup();
    const onViewVolumeDetails = vi.fn();
    render(
      <DistrictAverageVolumesSummaryCard
        rows={[
          {
            populationType: 'Dispersed',
            wasteType: 'H– Historic waste information',
            harvestMethodCode: 'C',
            assessmentMethod: 'D - District average',
            wasteLevel: 'X - Not stratified',
            netWasteAreaHa: 1.99,
            totalBillableVolumeM3: 57,
            totalCutControlVolumeM3: 57,
          },
        ]}
        totals={{ netWasteAreaHa: 1.99, totalBillableVolumeM3: 57, totalCutControlVolumeM3: 57 }}
        harvestMethodOptions={options}
        onHarvestMethodChange={vi.fn()}
        onViewVolumeDetails={onViewVolumeDetails}
      />,
    );

    expect(screen.getByRole('heading', { name: 'District average volumes summary' })).toBeTruthy();
    expect(screen.getByText('Population type')).toBeTruthy();
    expect(screen.getByText('Harvest method')).toBeTruthy();
    expect(screen.getByText('Dispersed')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'View volume details' }));
    expect(onViewVolumeDetails).toHaveBeenCalledOnce();
  });

  it('renders harvest method read-only when mode is read-only and is empty-safe', () => {
    render(
      <DistrictAverageVolumesSummaryCard
        mode="read-only"
        rows={[{ harvestMethodCode: 'C' }]}
        harvestMethodOptions={options}
      />,
    );

    expect(screen.getByText('C - Any combination')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('renders harvest method as display in form mode when no change handler is provided', () => {
    render(
      <DistrictAverageVolumesSummaryCard
        rows={[{ harvestMethodCode: 'UNKNOWN' }]}
        harvestMethodOptions={options}
      />,
    );

    expect(screen.getByText('UNKNOWN')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('calls onHarvestMethodChange when a harvest method is selected', async () => {
    const user = userEvent.setup();
    const onHarvestMethodChange = vi.fn();
    render(
      <DistrictAverageVolumesSummaryCard
        rows={[{ harvestMethodCode: '' }]}
        harvestMethodOptions={options}
        onHarvestMethodChange={onHarvestMethodChange}
      />,
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('C - Any combination'));
    expect(onHarvestMethodChange).toHaveBeenCalledWith(0, 'C');
  });

  it('renders empty-safe with dashes when no data is provided', () => {
    render(<DistrictAverageVolumesSummaryCard />);
    expect(screen.getAllByText('--').length).toBeGreaterThan(0);
  });
});
