import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

import BlockDetailsTab, { resolveSubmissionVariant } from './index';
import SubmissionDetailsCard from './cards/SubmissionDetailsCard';

const baseProps = {
  mode: 'form' as const,
  harvestStatuses: [],
  becZones: [],
  becSubzoneVariants: [],
  maturityOptions: [],
  districtAverageCriteria: [],
};

describe('BlockDetailsTab (Card 1 / submission details)', () => {
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

describe('tab-tier card navigation (stubs for cards 2-4)', () => {
  it('navigates to tabs via card actions', async () => {
    const user = userEvent.setup();
    const onNavigateTab = vi.fn();
    await renderWithAppAsync(
      <BlockDetailsTab {...baseProps} variant="interior" onNavigateTab={onNavigateTab} />,
    );

    await user.click(screen.getByRole('button', { name: 'Go to area calculator' }));
    await user.click(screen.getByRole('button', { name: 'View volume details' }));
    await user.click(screen.getByRole('button', { name: 'Add attachments' }));

    expect(onNavigateTab).toHaveBeenCalledWith(1);
    expect(onNavigateTab).toHaveBeenCalledWith(2);
    expect(onNavigateTab).toHaveBeenCalledWith(3);
  });
});
