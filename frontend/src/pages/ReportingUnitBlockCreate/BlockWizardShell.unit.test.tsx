import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useBlockWizardDirty } from './BlockWizardDirtyContext';
import BlockWizardShell from './BlockWizardShell';

/** Allows a panel to mark or clear the shared wizard dirty state. */
const DirtyStateControls = () => {
  const { isDirty, markDirty, clearDirty } = useBlockWizardDirty();

  return (
    <div>
      <span>{isDirty ? 'Dirty' : 'Clean'}</span>
      <button onClick={markDirty}>Mark dirty</button>
      <button onClick={clearDirty}>Clear dirty</button>
    </div>
  );
};

describe('BlockWizardShell', () => {
  it('shouldThrowWhenDirtyStateHookIsUsedOutsideItsProvider', () => {
    expect(() => renderHook(() => useBlockWizardDirty())).toThrow(
      'useBlockWizardDirty must be used within a BlockWizardDirtyProvider',
    );
  });

  it('shouldRenderDefaultDraftStateAndProvidedPanel', async () => {
    render(<BlockWizardShell panels={[<DirtyStateControls key="details" />]} />);

    expect(await screen.findByRole('tab', { name: 'Block details' })).toBeTruthy();
    expect(screen.getByText('Clean')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('shouldDisableSaveAndSubmit_whenBlockIsNotDraft', async () => {
    render(<BlockWizardShell blockState="SUBMITTED" />);

    expect(await screen.findByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true);
  });

  it('shouldSwitchTabsWithoutConfirmation_whenPanelIsClean', async () => {
    const user = userEvent.setup();
    render(
      <BlockWizardShell
        panels={[<DirtyStateControls key="details" />, <p key="area">Area panel</p>]}
      />,
    );

    await user.click(await screen.findByRole('tab', { name: 'Area calculator' }));

    await waitFor(() =>
      expect(
        screen.getByRole('tab', { name: 'Area calculator' }).getAttribute('aria-selected'),
      ).toBe('true'),
    );
  });

  it('shouldKeepTheFirstPanelActive_whenSelectingCurrentTab', async () => {
    const user = userEvent.setup();
    render(<BlockWizardShell />);

    const currentTab = await screen.findByRole('tab', { name: 'Block details' });
    await user.click(currentTab);

    expect(currentTab.getAttribute('aria-selected')).toBe('true');
  });

  it('shouldStayOnCurrentTab_whenDirtyTabChangeIsCancelled', async () => {
    const user = userEvent.setup();
    render(
      <BlockWizardShell
        panels={[<DirtyStateControls key="details" />, <p key="area">Area panel</p>]}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Mark dirty' }));
    await user.click(screen.getByRole('tab', { name: 'Area calculator' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Stay on tab' }));

    expect(screen.getByRole('tab', { name: 'Block details' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByText('Dirty')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Waste volumes' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shouldDiscardDirtyStateAndSwitchTabs_whenDiscardIsConfirmed', async () => {
    const user = userEvent.setup();
    render(
      <BlockWizardShell
        panels={[<DirtyStateControls key="details" />, <p key="area">Area panel</p>]}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Mark dirty' }));
    await user.click(screen.getByRole('tab', { name: 'Area calculator' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));

    expect(await screen.findByText('Area panel')).toBeTruthy();
    expect(screen.getByText('Clean')).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByRole('tab', { name: 'Area calculator' }).getAttribute('aria-selected'),
      ).toBe('true'),
    );
  });
});
