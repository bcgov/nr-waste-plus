import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

import CoastSubmissionDetailsForm from './index';

import type { CoastSubmissionDetailsFormProps } from './index';

const options: CoastSubmissionDetailsFormProps = {
  mode: 'form',
  harvestStatuses: [{ code: 'LC', description: 'Logging complete', areas: null }],
  maturityOptions: [{ code: 'IM', description: 'Immature', areas: null }],
  districtAverageCriteria: [{ code: '7', description: 'Criterion 7', areas: null }],
};

describe('CoastSubmissionDetailsForm', () => {
  it('renders the Coast fields and keeps benchmark values read-only', async () => {
    await renderWithAppAsync(
      <CoastSubmissionDetailsForm {...options} initialValues={{ wasteBenchmark: '25' }} />,
    );

    expect(screen.getByRole('heading', { name: 'Submission details' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Harvest status' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Maturity' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Heli logging' })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: 'Cable yarding (ha)' })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: 'Ground based (ha)' })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: 'Skyline logging (ha)' })).toBeTruthy();
    expect(screen.getByText('District average criteria')).toBeTruthy();
    expect(screen.getByTestId('card-item-content-waste-benchmark-(m³/ha)').textContent).toBe('25');
    expect(screen.queryByRole('combobox', { name: 'BEC zone' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'BEC subzone/variant' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Benchmark zone' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Waste benchmark (m³/ha)' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add secondary timber mark' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add road permit timber mark' })).toBeTruthy();
  });

  it('clamps harvest-area entry to three decimals', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(<CoastSubmissionDetailsForm {...options} />);

    await user.type(screen.getByRole('spinbutton', { name: 'Cable yarding (ha)' }), '1.2345');

    expect(screen.getByDisplayValue('1.234')).toBeTruthy();
    expect(screen.queryByDisplayValue('1.2345')).toBeNull();
  });

  it('shows placeholders for empty benchmark values in form mode', async () => {
    await renderWithAppAsync(
      <CoastSubmissionDetailsForm {...options} initialValues={{ wasteBenchmark: '' }} />,
    );

    expect(screen.getByTestId('card-item-content-waste-benchmark-(m³/ha)').textContent).toBe('--');
  });

  it('shows retention fields only while dispersed retention is enabled', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(<CoastSubmissionDetailsForm {...options} />);

    expect(screen.queryByRole('spinbutton', { name: 'Dispersed retention percentage' })).toBeNull();
    expect(
      screen.queryByRole('textbox', { name: 'Explain how retention percentage was calculated' }),
    ).toBeNull();

    await user.click(screen.getByRole('switch', { name: 'Is dispersed retention >= 50%?' }));

    expect(screen.getByRole('spinbutton', { name: 'Dispersed retention percentage' })).toBeTruthy();
    expect(
      screen.getByRole('textbox', { name: 'Explain how retention percentage was calculated' }),
    ).toBeTruthy();
  });

  it('renders supplied values in read-only mode without edit controls', async () => {
    await renderWithAppAsync(
      <CoastSubmissionDetailsForm
        {...options}
        mode="read-only"
        initialValues={{
          harvestStatusCode: 'LC',
          maturityCode: 'IM',
          isHeliLogging: true,
          cableYardingAreaHa: '12.500',
          wasteBenchmark: '25',
          districtAverageCriteriaCodes: ['7'],
        }}
      />,
    );

    expect(screen.getByText('Logging complete')).toBeTruthy();
    expect(screen.getByText('Immature')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    expect(screen.getByText('12.500')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
    expect(screen.getByText(/Criterion 7/)).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Maturity' })).toBeNull();
    expect(screen.queryByRole('spinbutton', { name: 'Cable yarding (ha)' })).toBeNull();
  });

  it('shows placeholders for empty benchmark values in read-only mode', async () => {
    await renderWithAppAsync(
      <CoastSubmissionDetailsForm
        {...options}
        mode="read-only"
        initialValues={{ wasteBenchmark: '' }}
      />,
    );

    expect(screen.getByTestId('card-item-content-waste-benchmark-(m³/ha)').textContent).toBe('--');
  });

  it('delegates add-mark actions without submitting the local form', async () => {
    const onAddRoadPermitTimberMark = vi.fn();
    const user = userEvent.setup();
    await renderWithAppAsync(
      <CoastSubmissionDetailsForm
        {...options}
        onAddRoadPermitTimberMark={onAddRoadPermitTimberMark}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add road permit timber mark' }));

    expect(onAddRoadPermitTimberMark).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Add road permit timber mark' })).toBeTruthy();
  });

  it('clears and disables the three harvest-area fields when heli logging is on (BR-4, D31)', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(<CoastSubmissionDetailsForm {...options} />);

    const cable = screen.getByRole('spinbutton', {
      name: 'Cable yarding (ha)',
    }) as HTMLInputElement;
    const ground = screen.getByRole('spinbutton', {
      name: 'Ground based (ha)',
    }) as HTMLInputElement;
    const skyline = screen.getByRole('spinbutton', {
      name: 'Skyline logging (ha)',
    }) as HTMLInputElement;

    await user.type(cable, '1.5');
    expect(cable.value).toBe('1.5');
    expect(cable.disabled).toBe(false);
    expect(skyline).toBeTruthy(); // D31: Skyline stays visible

    await user.click(screen.getByRole('switch', { name: 'Heli logging' }));

    expect(cable.disabled).toBe(true);
    expect(ground.disabled).toBe(true);
    expect(skyline.disabled).toBe(true);
    expect(cable.value).toBe('');
    expect(ground.value).toBe('');
    expect(skyline.value).toBe('');

    await user.click(screen.getByRole('switch', { name: 'Heli logging' }));
    expect(cable.disabled).toBe(false);
  });

  it('renders dispersed retention details and legacy criteria in read-only mode (D28)', async () => {
    await renderWithAppAsync(
      <CoastSubmissionDetailsForm
        {...options}
        mode="read-only"
        initialValues={{
          hasDispersedRetention: true,
          dispersedRetentionPct: '75',
          dispersedRetentionExplanation: 'Survey based',
          districtAverageCriteriaCode: '7',
        }}
      />,
    );

    expect(screen.getByText('75')).toBeTruthy();
    expect(screen.getByText('Survey based')).toBeTruthy();
    expect(screen.getByText(/Criterion 7/)).toBeTruthy();
  });

  it('validates dispersed retention fields in form mode (BR-1, D32)', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(<CoastSubmissionDetailsForm {...options} />);

    await user.click(screen.getByRole('switch', { name: 'Is dispersed retention >= 50%?' }));
    const pct = screen.getByRole('spinbutton', { name: 'Dispersed retention percentage' });
    const explanation = screen.getByRole('textbox', {
      name: 'Explain how retention percentage was calculated',
    });

    await user.type(pct, '49');
    expect(await screen.findByText('Enter a whole number between 50 and 100.')).toBeTruthy();

    await user.clear(pct);
    await user.type(pct, '75');
    expect(screen.queryByText('Enter a whole number between 50 and 100.')).toBeNull();

    await user.click(explanation);
    await user.type(explanation, 'x');
    await user.clear(explanation);
    await user.tab();
    expect(
      await screen.findByText('Explain how the retention percentage was calculated.'),
    ).toBeTruthy();
  });
});
