import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

import SubmissionDetailsForm, { resolveSubmissionVariant } from './index';

describe('resolveSubmissionVariant', () => {
  it('selects coast by grade description regardless of case or whitespace', () => {
    expect(resolveSubmissionVariant({ code: 'CO', description: 'Coast' })).toBe('coast');
    expect(resolveSubmissionVariant({ code: 'c', description: ' coast ' })).toBe('coast');
  });

  it('selects interior for interior grades, unknown grades, and missing grades', () => {
    expect(resolveSubmissionVariant({ code: 'IN', description: 'Interior' })).toBe('interior');
    expect(resolveSubmissionVariant({ code: 'G1', description: 'Grade 1' })).toBe('interior');
    expect(resolveSubmissionVariant({ code: null, description: null })).toBe('interior');
    expect(resolveSubmissionVariant(null)).toBe('interior');
    expect(resolveSubmissionVariant(undefined)).toBe('interior');
  });
});

const sharedProps = {
  mode: 'form',
  harvestStatuses: [],
  becZones: [],
  becSubzoneVariants: [],
  maturityOptions: [],
  districtAverageCriteria: [],
} as const;

describe('SubmissionDetailsForm', () => {
  it('renders the interior twin for the interior variant', async () => {
    await renderWithAppAsync(<SubmissionDetailsForm {...sharedProps} variant="interior" />);

    expect(screen.getByRole('combobox', { name: 'BEC zone' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Maturity' })).toBeNull();
  });

  it('renders the coast twin for the coast variant', async () => {
    await renderWithAppAsync(<SubmissionDetailsForm {...sharedProps} variant="coast" />);

    expect(screen.getByRole('combobox', { name: 'Maturity' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Heli logging' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'BEC zone' })).toBeNull();
  });
});
