import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdditionalRequirementsCard from './index';

const PILES = 'Were any piles on this block burnt prior to submission?';
const RATIONALE = 'Does this block require a rationale according to the Waste manual?';
const CERTIFY = 'I hereby certify that none of the above conditions apply to this block';

describe('AdditionalRequirementsCard (S8, D11, BR-3)', () => {
  it('shows certify checkbox only when both toggles are No (D11)', async () => {
    const user = userEvent.setup();
    render(<AdditionalRequirementsCard mode="form" />);

    expect(screen.getByLabelText(CERTIFY)).toBeTruthy();

    await user.click(screen.getByRole('switch', { name: PILES }));
    expect(screen.queryByLabelText(CERTIFY)).toBeNull();

    await user.click(screen.getByRole('switch', { name: PILES }));
    expect(screen.getByLabelText(CERTIFY)).toBeTruthy();

    await user.click(screen.getByRole('switch', { name: RATIONALE }));
    expect(screen.queryByLabelText(CERTIFY)).toBeNull();
  });

  it('clears certify and hides it when a toggle becomes Yes (D11)', async () => {
    const user = userEvent.setup();
    render(<AdditionalRequirementsCard mode="form" />);

    const certify = screen.getByLabelText(CERTIFY) as HTMLInputElement;
    await user.click(certify);
    expect(certify.checked).toBe(true);

    await user.click(screen.getByRole('switch', { name: PILES }));
    expect(screen.queryByLabelText(CERTIFY)).toBeNull();

    await user.click(screen.getByRole('switch', { name: PILES }));
    expect((screen.getByLabelText(CERTIFY) as HTMLInputElement).checked).toBe(false);
  });

  it('requires certify when both toggles are No (BR-3)', async () => {
    const user = userEvent.setup();
    render(<AdditionalRequirementsCard mode="form" />);

    const certify = screen.getByLabelText(CERTIFY);
    await user.click(certify);
    await user.click(certify);

    expect(
      await screen.findByText('Select the checkbox to confirm before continuing.'),
    ).toBeTruthy();
  });

  it('renders read-only values and calls Add attachments', async () => {
    const user = userEvent.setup();
    const onAddAttachments = vi.fn();
    render(
      <AdditionalRequirementsCard
        mode="read-only"
        initialValues={{
          werePilesBurnt: false,
          requiresRationale: false,
          certifyNoAdditionalRequirements: true,
        }}
        onAddAttachments={onAddAttachments}
      />,
    );

    expect(screen.getAllByText('No').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Yes')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add attachments' }));
    expect(onAddAttachments).toHaveBeenCalledOnce();
  });

  it('hides certify in read-only mode when a toggle is Yes (D11)', () => {
    render(
      <AdditionalRequirementsCard
        mode="read-only"
        initialValues={{
          werePilesBurnt: true,
          requiresRationale: false,
          certifyNoAdditionalRequirements: true,
        }}
      />,
    );

    expect(screen.queryByText(CERTIFY)).toBeNull();
    expect(screen.getByText('Yes')).toBeTruthy();
  });
});
