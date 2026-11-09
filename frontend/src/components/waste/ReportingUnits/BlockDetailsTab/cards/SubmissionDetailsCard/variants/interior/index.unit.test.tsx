import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

import InteriorSubmissionDetailsForm from './index';

import type { InteriorSubmissionDetailsFormProps } from './types';

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
    expect(screen.getByText('District average criteria')).toBeTruthy();
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
          districtAverageCriteriaCodes: ['7'],
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

  it('adds a secondary timber mark section with BR-2 normalization (S6)', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(<InteriorSubmissionDetailsForm {...options} />);

    await user.click(screen.getByRole('button', { name: 'Add secondary timber mark' }));
    const input = screen.getByLabelText('Secondary timber mark 1');
    fireEvent.change(input, { target: { value: 'ab-12' } });
    expect((input as HTMLInputElement).value).toBe('AB12');
  });

  it('validates dispersed retention fields when enabled (BR-1, D32)', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(<InteriorSubmissionDetailsForm {...options} />);

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

  it('clears retention fields when dispersed retention is turned off (BR-1)', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(<InteriorSubmissionDetailsForm {...options} />);

    await user.click(screen.getByRole('switch', { name: 'Is dispersed retention >= 50%?' }));
    const pct = screen.getByRole('spinbutton', { name: 'Dispersed retention percentage' });
    await user.type(pct, '60');

    await user.click(screen.getByRole('switch', { name: 'Is dispersed retention >= 50%?' }));
    await user.click(screen.getByRole('switch', { name: 'Is dispersed retention >= 50%?' }));

    expect(
      (
        screen.getByRole('spinbutton', {
          name: 'Dispersed retention percentage',
        }) as HTMLInputElement
      ).value,
    ).toBe('');
  });

  it('filters BEC subzone variants by selected zone and resets on zone change', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(
      <InteriorSubmissionDetailsForm
        {...options}
        becZones={[
          { code: 'SBS', description: 'Sub-Boreal Spruce', areas: null },
          { code: 'ICH', description: 'Interior Cedar Hemlock', areas: null },
        ]}
        becSubzoneVariants={[
          { code: 'dw2', description: 'SBS dw2', becZoneCode: 'SBS', areas: null },
          { code: 'mk1', description: 'ICH mk1', becZoneCode: 'ICH', areas: null },
        ]}
      />,
    );

    expect(
      screen.getByRole('combobox', { name: 'BEC subzone/variant' }).hasAttribute('disabled') ||
        (screen.getByRole('combobox', { name: 'BEC subzone/variant' }) as HTMLInputElement)
          .disabled,
    ).toBe(true);

    await user.click(screen.getByRole('combobox', { name: 'BEC zone' }));
    await user.click(await screen.findByText('Sub-Boreal Spruce'));

    await user.click(screen.getByRole('combobox', { name: 'BEC subzone/variant' }));
    await user.click(await screen.findByText('SBS dw2'));

    await user.click(screen.getByRole('combobox', { name: 'BEC zone' }));
    await user.click(await screen.findByText('Interior Cedar Hemlock'));
    expect(screen.getByRole('combobox', { name: 'BEC subzone/variant' })).toBeTruthy();
  });

  it('renders read-only values including multi-select criteria and retention (D28)', async () => {
    await renderWithAppAsync(
      <InteriorSubmissionDetailsForm
        {...options}
        mode="read-only"
        initialValues={{
          harvestStatusCode: 'LC',
          becZoneCode: 'SBS',
          becSubzoneVariantCode: 'dw2',
          wasteBenchmark: '11',
          benchmarkZone: 'BZ',
          hasDispersedRetention: true,
          dispersedRetentionPct: '60',
          dispersedRetentionExplanation: 'Calc',
          districtAverageCriteriaCodes: ['7'],
        }}
        becZones={[{ code: 'SBS', description: 'Sub-Boreal Spruce', areas: null }]}
        becSubzoneVariants={[
          { code: 'dw2', description: 'SBS dw2', becZoneCode: 'SBS', areas: null },
        ]}
      />,
    );

    expect(screen.getByText('Logging complete')).toBeTruthy();
    expect(screen.getByText('Sub-Boreal Spruce')).toBeTruthy();
    expect(screen.getByText('60')).toBeTruthy();
    expect(screen.getByText(/Criterion 7/)).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'BEC zone' })).toBeNull();
  });
});
