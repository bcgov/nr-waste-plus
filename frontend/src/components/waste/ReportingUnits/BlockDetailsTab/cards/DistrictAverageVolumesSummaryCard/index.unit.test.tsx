import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DistrictAverageVolumesSummaryCard from './index';

const harvestMethodOptions = [
  { code: 'G', description: 'Ground', areas: null },
  { code: 'C', description: 'Cable', areas: null },
];

describe('DistrictAverageVolumesSummaryCard', () => {
  it('renders header, helper, columns, and view action', () => {
    const onViewVolumeDetails = vi.fn();
    render(
      <DistrictAverageVolumesSummaryCard
        mode="read-only"
        onViewVolumeDetails={onViewVolumeDetails}
      />,
    );

    expect(screen.getByRole('heading', { name: 'District average volumes summary' })).toBeTruthy();
    expect(
      screen.getByText('Estimated volumes are auto-calculated and may differ from final volumes'),
    ).toBeTruthy();
    expect(screen.getByText('Population type')).toBeTruthy();
    expect(screen.getByText('Waste type')).toBeTruthy();
    expect(screen.getByText('Harvest method')).toBeTruthy();
    expect(screen.getByText('Assessment method')).toBeTruthy();
    expect(screen.getByText('Waste level')).toBeTruthy();
    expect(screen.getByText('Net waste area (ha)')).toBeTruthy();
    expect(screen.getByText('Total billable volume (m³)')).toBeTruthy();
    expect(screen.getByText('Total cut control volume (m³)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View volume details' })).toBeTruthy();
  });

  it('renders rows and totals as received/empty-safe', () => {
    render(
      <DistrictAverageVolumesSummaryCard
        mode="read-only"
        rows={[
          {
            populationType: 'Dispersed',
            wasteType: 'H– Historic waste information',
            harvestMethodCode: 'G',
            assessmentMethod: 'D - District average',
            wasteLevel: 'X - Not stratified',
            netWasteAreaHa: null,
            totalBillableVolumeM3: '',
            totalCutControlVolumeM3: undefined,
          },
        ]}
        totals={{ totalBillableVolumeM3: null, totalCutControlVolumeM3: '12.5' }}
        harvestMethodOptions={harvestMethodOptions}
      />,
    );

    expect(screen.getByText('Dispersed')).toBeTruthy();
    expect(screen.getByText('H– Historic waste information')).toBeTruthy();
    expect(screen.getByText('Ground')).toBeTruthy();
    expect(screen.getByText('D - District average')).toBeTruthy();
    expect(screen.getByText('X - Not stratified')).toBeTruthy();

    const dataRow = screen.getByText('Dispersed').closest('[role="row"]');
    expect(dataRow).not.toBeNull();
    expect(within(dataRow as HTMLElement).getAllByText('-')).toHaveLength(3);

    const totalLabel = screen.getByText('Total');
    const totalRow = totalLabel.closest('[role="row"]');
    expect(totalRow).not.toBeNull();
    expect(within(totalRow as HTMLElement).getByText('-')).toBeTruthy();
    expect(within(totalRow as HTMLElement).getByText('12.5')).toBeTruthy();
  });

  it('calls onHarvestMethodChange in form mode', async () => {
    const user = userEvent.setup();
    const onHarvestMethodChange = vi.fn();

    render(
      <DistrictAverageVolumesSummaryCard
        mode="form"
        rows={[
          {
            populationType: 'Dispersed',
            wasteType: 'H– Historic waste information',
            harvestMethodCode: null,
            assessmentMethod: 'D - District average',
            wasteLevel: 'X - Not stratified',
          },
        ]}
        harvestMethodOptions={harvestMethodOptions}
        onHarvestMethodChange={onHarvestMethodChange}
      />,
    );

    await user.click(
      screen.getByRole('combobox', {
        name: 'Harvest method for Dispersed, H– Historic waste information',
      }),
    );
    await user.click(screen.getByText('Cable'));

    expect(onHarvestMethodChange).toHaveBeenCalledWith(0, 'C');
  });

  it('renders selected harvest method in form mode from row code', () => {
    render(
      <DistrictAverageVolumesSummaryCard
        mode="form"
        rows={[
          {
            populationType: 'Dispersed',
            wasteType: 'H– Historic waste information',
            harvestMethodCode: 'G',
            assessmentMethod: 'D - District average',
            wasteLevel: 'X - Not stratified',
          },
        ]}
        harvestMethodOptions={harvestMethodOptions}
      />,
    );

    expect(screen.getByText('Ground')).toBeTruthy();
  });

  it('calls onViewVolumeDetails when button is clicked', async () => {
    const user = userEvent.setup();
    const onViewVolumeDetails = vi.fn();

    render(<DistrictAverageVolumesSummaryCard onViewVolumeDetails={onViewVolumeDetails} />);

    await user.click(screen.getByRole('button', { name: 'View volume details' }));
    expect(onViewVolumeDetails).toHaveBeenCalledTimes(1);
  });

  it('shows a dash in the read-only harvest method cell when the row has no method', () => {
    render(
      <DistrictAverageVolumesSummaryCard
        mode="read-only"
        rows={[
          {
            populationType: 'Dispersed',
            wasteType: 'H– Historic waste information',
            harvestMethodCode: null,
            assessmentMethod: 'D - District average',
            wasteLevel: 'X - Not stratified',
            netWasteAreaHa: '1.2',
            totalBillableVolumeM3: '3.4',
            totalCutControlVolumeM3: '5.6',
          },
        ]}
        harvestMethodOptions={harvestMethodOptions}
      />,
    );

    const dataRow = screen.getByRole('row', { name: /Dispersed/ });
    expect(within(dataRow).getAllByText('-')).toHaveLength(1);
  });

  it('shows the raw code in read-only mode when the option list lacks it', () => {
    render(
      <DistrictAverageVolumesSummaryCard
        mode="read-only"
        rows={[{ populationType: 'Dispersed', wasteType: 'H', harvestMethodCode: 'ZZ' }]}
        harvestMethodOptions={harvestMethodOptions}
      />,
    );

    expect(screen.getByText('ZZ')).toBeTruthy();
  });

  it('names the dropdown by row position when the row has no population or waste type', () => {
    render(
      <DistrictAverageVolumesSummaryCard
        mode="form"
        rows={[{ harvestMethodCode: null }]}
        harvestMethodOptions={harvestMethodOptions}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Harvest method for row 1' })).toBeTruthy();
  });
});
