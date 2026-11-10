import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

  it('navigates to tabs via card actions and supports provided add-attachments handler', async () => {
    const user = userEvent.setup();
    const onNavigateTab = vi.fn();
    const onAddAttachments = vi.fn();
    const { rerender } = render(
      <BlockDetailsTab {...baseProps} variant="interior" onNavigateTab={onNavigateTab} />,
    );

    await user.click(screen.getByRole('button', { name: 'Go to area calculator' }));
    await user.click(screen.getByRole('button', { name: 'View volume details' }));
    await user.click(screen.getByRole('button', { name: 'Add attachments' }));
    expect(onNavigateTab).toHaveBeenCalledWith(1);
    expect(onNavigateTab).toHaveBeenCalledWith(2);
    expect(onNavigateTab).toHaveBeenCalledWith(3);

    rerender(
      <BlockDetailsTab
        {...baseProps}
        variant="interior"
        onNavigateTab={onNavigateTab}
        additionalRequirements={{ mode: 'form', onAddAttachments }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Add attachments' }));
    expect(onAddAttachments).toHaveBeenCalled();
  });

  it('re-exports resolveSubmissionVariant', () => {
    expect(resolveSubmissionVariant({ code: 'C', description: 'Coast' })).toBe('coast');
    expect(resolveSubmissionVariant({ code: 'I', description: 'Interior' })).toBe('interior');
  });
});
