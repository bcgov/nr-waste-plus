import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

vi.mock('@/components/Form/ActiveMultiSelect', () => ({
  default: () => <div data-testid="criteria-mock" />,
}));

vi.mock('@carbon/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@carbon/react')>();
  return {
    ...actual,
    ComboBox: ({
      id,
      titleText,
      onChange,
      items = [],
    }: {
      id?: string;
      titleText?: string;
      onChange?: (data: { selectedItem: { code: string; description: string } | null }) => void;
      items?: Array<{ code: string; description: string }>;
    }) => (
      <label>
        {titleText}
        <select
          data-testid={id}
          aria-label={titleText}
          onChange={(e) => {
            const code = e.target.value;
            onChange?.({
              selectedItem: code ? (items.find((i) => i.code === code) ?? null) : null,
            });
          }}
        >
          <option value="">none</option>
          {items.map((i) => (
            <option key={i.code} value={i.code}>
              {i.description}
            </option>
          ))}
        </select>
      </label>
    ),
    DatePicker: ({
      onChange,
      children,
    }: {
      onChange?: (dates: Date[]) => void;
      children?: ReactNode;
    }) => (
      <div>
        {children}
        <button
          type="button"
          data-testid="pick-date"
          onClick={() => onChange?.([new Date(2026, 4, 9)])}
        >
          pick
        </button>
        <button type="button" data-testid="clear-date" onClick={() => onChange?.([])}>
          clear
        </button>
      </div>
    ),
    DatePickerInput: ({
      labelText,
      id,
      onBlur,
    }: ComponentProps<'input'> & { labelText?: string }) => (
      <input id={id} aria-label={labelText} onBlur={onBlur} />
    ),
  };
});

import { InteriorSubmissionDetailsFormView } from './Form';

const codeItem = (code: string, description: string) => ({ code, description, areas: null });

describe('InteriorSubmissionDetailsFormView wiring', () => {
  it('handles date, harvest status, and BEC zone/subzone changes', async () => {
    const user = userEvent.setup();
    const { container } = await renderWithAppAsync(
      <InteriorSubmissionDetailsFormView
        harvestStatuses={[codeItem('LC', 'Logging complete')]}
        becZones={[codeItem('SBS', 'Sub-Boreal Spruce'), codeItem('ICH', 'Interior Cedar Hemlock')]}
        becSubzoneVariants={[
          { code: 'dw2', description: 'SBS dw2', becZoneCode: 'SBS', areas: null },
          { code: 'mk1', description: 'ICH mk1', becZoneCode: 'ICH', areas: null },
        ]}
        districtAverageCriteria={[]}
      />,
    );

    await user.click(screen.getByTestId('pick-date'));
    await user.click(screen.getByTestId('clear-date'));

    fireEvent.change(screen.getByTestId('interior-harvest-status'), { target: { value: 'LC' } });
    fireEvent.change(screen.getByTestId('interior-harvest-status'), { target: { value: '' } });

    fireEvent.change(screen.getByTestId('interior-bec-zone'), { target: { value: 'SBS' } });
    fireEvent.change(screen.getByTestId('interior-bec-subzone-variant'), {
      target: { value: 'dw2' },
    });
    fireEvent.change(screen.getByTestId('interior-bec-zone'), { target: { value: 'ICH' } });

    const form = container.querySelector('form[aria-label="Interior submission details"]');
    expect(form).toBeTruthy();
    if (form) fireEvent.submit(form);
  });
});
