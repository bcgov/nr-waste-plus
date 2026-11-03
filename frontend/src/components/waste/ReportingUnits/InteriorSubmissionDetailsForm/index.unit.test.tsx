import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

import InteriorSubmissionDetailsForm from './index';

import type { InteriorSubmissionDetailsFormProps } from './index';

const options: InteriorSubmissionDetailsFormProps = {
  mode: 'form',
  harvestStatuses: [{ code: 'LC', description: 'Logging complete', areas: null }],
  becZones: [{ code: 'IDF', description: 'Interior Douglas-fir', areas: null }],
  becSubzoneVariants: [{ code: 'un', description: 'un', areas: ['IDF'], becZoneCode: 'IDF' }],
  districtAverageCriteria: [{ code: '7', description: 'Criterion 7', areas: null }],
};

describe('InteriorSubmissionDetailsForm', () => {
  it('renders the Interior fields and keeps benchmark values read-only', async () => {
    await renderWithAppAsync(
      <InteriorSubmissionDetailsForm
        {...options}
        initialValues={{ benchmarkZone: 'Dry belt', wasteBenchmark: '4' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Submission details' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Harvest status' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'BEC zone' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'BEC subzone/variant' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'District average criteria' })).toBeTruthy();
    expect(screen.getByText('Dry belt')).toBeTruthy();
    expect(screen.getByTestId('card-item-content-waste-benchmark-(m³/ha)').textContent).toBe('4');
    expect(screen.getByRole('button', { name: 'Add secondary timber mark' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add road permit timber mark' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Benchmark zone' })).toBeNull();
  });

  it('shows placeholders for empty benchmark values in form mode', async () => {
    await renderWithAppAsync(
      <InteriorSubmissionDetailsForm
        {...options}
        initialValues={{ benchmarkZone: '', wasteBenchmark: '' }}
      />,
    );

    expect(screen.getByTestId('card-item-content-benchmark-zone').textContent).toBe('--');
    expect(screen.getByTestId('card-item-content-waste-benchmark-(m³/ha)').textContent).toBe('--');
  });

  it('shows retention fields only while dispersed retention is enabled', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(<InteriorSubmissionDetailsForm {...options} />);

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
      <InteriorSubmissionDetailsForm
        {...options}
        mode="read-only"
        initialValues={{
          harvestStatusCode: 'LC',
          becZoneCode: 'IDF',
          becSubzoneVariantCode: 'un',
          benchmarkZone: 'Dry belt',
          wasteBenchmark: '4',
          districtAverageCriteriaCode: '7',
        }}
      />,
    );

    expect(screen.getByText('Logging complete')).toBeTruthy();
    expect(screen.getByText('Interior Douglas-fir')).toBeTruthy();
    expect(screen.getByText('Dry belt')).toBeTruthy();
    expect(screen.getByText('Criterion 7')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'BEC zone' })).toBeNull();
  });

  it('shows placeholders for empty benchmark values in read-only mode', async () => {
    await renderWithAppAsync(
      <InteriorSubmissionDetailsForm
        {...options}
        mode="read-only"
        initialValues={{ benchmarkZone: '', wasteBenchmark: '' }}
      />,
    );

    expect(screen.getByTestId('card-item-content-benchmark-zone').textContent).toBe('--');
    expect(screen.getByTestId('card-item-content-waste-benchmark-(m³/ha)').textContent).toBe('--');
  });

  it('delegates add-mark actions without submitting the local form', async () => {
    const onAddSecondaryTimberMark = vi.fn();
    const user = userEvent.setup();
    await renderWithAppAsync(
      <InteriorSubmissionDetailsForm
        {...options}
        onAddSecondaryTimberMark={onAddSecondaryTimberMark}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add secondary timber mark' }));

    expect(onAddSecondaryTimberMark).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Add secondary timber mark' })).toBeTruthy();
  });
});
