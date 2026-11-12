import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdditionalRequirementsCard from './index';

const PILE_BURN_QUESTION = 'Were any piles on this block burnt prior to submission?';
const RATIONALE_QUESTION = 'Does this block require a rationale according to the Waste manual?';
const CERTIFY_LABEL = 'I hereby certify that none of the above conditions apply to this block';

describe('AdditionalRequirementsCard', () => {
  it('renders header, helper, and calls onAddAttachments', async () => {
    const user = userEvent.setup();
    const onAddAttachments = vi.fn();

    render(<AdditionalRequirementsCard mode="form" onAddAttachments={onAddAttachments} />);

    expect(screen.getByRole('heading', { name: 'Additional requirements' })).toBeTruthy();
    expect(
      screen.getByText("Please select 'yes' if any of these conditions apply to this block"),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Add attachments' }));
    expect(onAddAttachments).toHaveBeenCalledTimes(1);
  });

  it('renders both toggles defaulting to No and the certify checkbox (D11 visible)', () => {
    render(<AdditionalRequirementsCard mode="form" />);

    const pilesToggle = screen.getByRole('switch', { name: PILE_BURN_QUESTION });
    const rationaleToggle = screen.getByRole('switch', { name: RATIONALE_QUESTION });
    expect(pilesToggle).toBeTruthy();
    expect(rationaleToggle).toBeTruthy();
    expect(pilesToggle.getAttribute('aria-checked')).toBe('false');
    expect(rationaleToggle.getAttribute('aria-checked')).toBe('false');

    const certify = screen.getByRole('checkbox', { name: CERTIFY_LABEL });
    expect(certify).toBeTruthy();
    expect((certify as HTMLInputElement).checked).toBe(false);
    expect((certify as HTMLInputElement).required).toBe(true);
  });

  it('hides and forces the certify checkbox false when a toggle goes to Yes, then re-shows it (D11)', async () => {
    const user = userEvent.setup();
    render(<AdditionalRequirementsCard mode="form" />);

    await user.click(screen.getByRole('switch', { name: PILE_BURN_QUESTION }));
    expect(screen.queryByRole('checkbox', { name: CERTIFY_LABEL })).toBeNull();

    await user.click(screen.getByRole('switch', { name: PILE_BURN_QUESTION }));
    const certify = screen.getByRole('checkbox', { name: CERTIFY_LABEL });
    expect((certify as HTMLInputElement).checked).toBe(false);
    expect((certify as HTMLInputElement).required).toBe(true);
  });

  it('shows the BR-3 blur error while unchecked and clears it when ticked', async () => {
    const user = userEvent.setup();
    render(<AdditionalRequirementsCard mode="form" />);

    const certify = screen.getByRole('checkbox', { name: CERTIFY_LABEL });
    certify.focus();
    await user.tab();

    expect(screen.getByText('Select the checkbox to confirm before continuing.')).toBeTruthy();

    await user.click(certify);
    expect(screen.queryByText('Select the checkbox to confirm before continuing.')).toBeNull();
    expect((certify as HTMLInputElement).checked).toBe(true);
  });

  it('clears the certify error when either toggle moves to Yes', async () => {
    const user = userEvent.setup();
    render(<AdditionalRequirementsCard mode="form" />);

    const certify = screen.getByRole('checkbox', { name: CERTIFY_LABEL });
    certify.focus();
    await user.tab();
    expect(screen.getByText('Select the checkbox to confirm before continuing.')).toBeTruthy();

    await user.click(screen.getByRole('switch', { name: RATIONALE_QUESTION }));
    expect(screen.queryByText('Select the checkbox to confirm before continuing.')).toBeNull();
  });

  it('honours initialValues', () => {
    render(
      <AdditionalRequirementsCard
        mode="form"
        initialValues={{
          werePilesBurnt: true,
          requiresRationale: false,
          certifyNoAdditionalRequirements: false,
        }}
      />,
    );

    expect(
      screen.getByRole('switch', { name: PILE_BURN_QUESTION }).getAttribute('aria-checked'),
    ).toBe('true');
    // D11: piles burnt = Yes, so no certify checkbox.
    expect(screen.queryByRole('checkbox', { name: CERTIFY_LABEL })).toBeNull();
  });

  it('renders read-only Yes/No values and hides the certify checkbox when not both No', () => {
    render(
      <AdditionalRequirementsCard
        mode="read-only"
        initialValues={{ werePilesBurnt: false, requiresRationale: true }}
      />,
    );

    expect(screen.getByText(PILE_BURN_QUESTION)).toBeTruthy();
    expect(screen.getByText(RATIONALE_QUESTION)).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByText('No')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: CERTIFY_LABEL })).toBeNull();
  });

  it('renders the certify value read-only when both toggles are No', () => {
    render(
      <AdditionalRequirementsCard
        mode="read-only"
        initialValues={{
          werePilesBurnt: false,
          requiresRationale: false,
          certifyNoAdditionalRequirements: true,
        }}
      />,
    );

    expect(screen.getByText(CERTIFY_LABEL)).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
