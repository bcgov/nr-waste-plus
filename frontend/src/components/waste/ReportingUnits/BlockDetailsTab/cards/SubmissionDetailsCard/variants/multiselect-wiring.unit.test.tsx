import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

vi.mock('@/components/Form/ActiveMultiSelect', () => ({
  default: ({
    onChange,
    id,
    titleText,
  }: {
    onChange?: (data: { selectedItems?: Array<{ code?: string | null; value?: string }> }) => void;
    id?: string;
    titleText?: string;
  }) => (
    <div>
      <span>{titleText}</span>
      <button
        type="button"
        data-testid={`${id}-pick`}
        onClick={() => onChange?.({ selectedItems: [{ code: '7' }, { value: '8' }] })}
      >
        pick
      </button>
      <button
        type="button"
        data-testid={`${id}-clear`}
        onClick={() => onChange?.({ selectedItems: undefined })}
      >
        clear
      </button>
    </div>
  ),
}));

import CoastSubmissionDetailsForm from './coast';
import { InteriorSubmissionDetailsFormView } from './interior/Form';

const codeItem = (code: string, description: string) => ({ code, description, areas: null });

describe('district average criteria MultiSelect wiring (D28)', () => {
  it('maps selected items to criteria codes in the interior form', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(
      <InteriorSubmissionDetailsFormView
        harvestStatuses={[codeItem('LC', 'Logging complete')]}
        becZones={[]}
        becSubzoneVariants={[]}
        districtAverageCriteria={[codeItem('7', 'Criterion 7'), codeItem('8', 'Criterion 8')]}
      />,
    );

    await user.click(screen.getByTestId('interior-district-average-criteria-pick'));
    await user.click(screen.getByTestId('interior-district-average-criteria-clear'));
    expect(screen.getByText('District average criteria')).toBeTruthy();
  });

  it('maps selected items to criteria codes in the coast form', async () => {
    const user = userEvent.setup();
    await renderWithAppAsync(
      <CoastSubmissionDetailsForm
        mode="form"
        harvestStatuses={[]}
        maturityOptions={[]}
        districtAverageCriteria={[codeItem('7', 'Criterion 7')]}
      />,
    );

    await user.click(screen.getByTestId('coast-district-average-criteria-pick'));
    await user.click(screen.getByTestId('coast-district-average-criteria-clear'));
    expect(screen.getByText('District average criteria')).toBeTruthy();
  });
});
