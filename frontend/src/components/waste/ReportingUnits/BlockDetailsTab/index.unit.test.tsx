import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BlockDetailsTab, { resolveSubmissionVariant } from './index';

const baseProps = {
  mode: 'form' as const,
  harvestStatuses: [],
  becZones: [],
  becSubzoneVariants: [],
  maturityOptions: [],
  districtAverageCriteria: [],
};

describe('BlockDetailsTab (foundation)', () => {
  it('renders the block details tab sections', () => {
    render(<BlockDetailsTab {...baseProps} grade={{ code: 'I', description: 'Interior' }} />);

    expect(screen.getByLabelText('Submission details')).toBeTruthy();
    expect(screen.getByLabelText('Waste assessment area summary')).toBeTruthy();
    expect(screen.getByLabelText('District average volumes summary')).toBeTruthy();
    expect(screen.getByLabelText('Additional requirements')).toBeTruthy();
  });

  it('re-exports resolveSubmissionVariant', () => {
    expect(resolveSubmissionVariant({ code: 'C', description: 'Coast' })).toBe('coast');
    expect(resolveSubmissionVariant({ code: 'I', description: 'Interior' })).toBe('interior');
  });
});
