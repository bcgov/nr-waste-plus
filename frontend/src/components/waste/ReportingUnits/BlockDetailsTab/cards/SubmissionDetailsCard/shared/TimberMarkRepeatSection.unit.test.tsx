import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import TimberMarkRepeatSection from './TimberMarkRepeatSection';

const Harness = ({
  max = 5,
  mode = 'form' as const,
  initial = [] as string[],
  onChangeSpy,
}: {
  max?: number;
  mode?: 'form' | 'read-only';
  initial?: string[];
  onChangeSpy?: (marks: string[]) => void;
}) => {
  const [marks, setMarks] = useState<string[]>(initial);
  return (
    <TimberMarkRepeatSection
      label="Secondary timber mark"
      addButtonLabel="Add secondary timber mark"
      idPrefix="secondary"
      mode={mode}
      max={max}
      marks={marks}
      onChange={(next) => {
        setMarks(next);
        onChangeSpy?.(next);
      }}
    />
  );
};

describe('TimberMarkRepeatSection (S6, BR-2)', () => {
  it('adds entries, normalizes to alphanumeric uppercase, and exposes marks array', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);

    await user.click(screen.getByRole('button', { name: 'Add secondary timber mark' }));
    const input = screen.getByLabelText('Secondary timber mark 1');
    fireEvent.change(input, { target: { value: 'ab-12 /c' } });

    expect(onChangeSpy).toHaveBeenCalled();
    const last = onChangeSpy.mock.calls.at(-1)?.[0] as string[];
    expect(last).toEqual(['AB12C']);
  });

  it('prevents adding beyond max with observable feedback (BR-2, max 5)', async () => {
    const user = userEvent.setup();
    render(<Harness max={2} initial={['A', 'B']} />);

    const add = screen.getByRole('button', { name: 'Add secondary timber mark' });
    expect((add as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/up to 2/i);
  });

  it('asks for confirmation before removing in form mode (Draft remove)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['TM1']} />);

    await user.click(screen.getByRole('button', { name: 'Remove secondary timber mark 1' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Remove timber mark?')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Secondary timber mark 1')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Remove secondary timber mark 1' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByLabelText('Secondary timber mark 1')).toBeNull();
  });

  it('renders marks read-only and nothing when empty', () => {
    const { container, unmount } = render(<Harness mode="read-only" initial={[]} />);
    expect(container.querySelector('[data-testid="secondary-read-only"]')).toBeNull();
    unmount();

    render(<Harness mode="read-only" initial={['TM1', '']} />);
    expect(screen.getByText(/TM1/)).toBeTruthy();
    expect(screen.getByText(/--/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add secondary timber mark' })).toBeNull();
  });

  it('closes the remove confirmation via the modal close control', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['TM1']} />);

    await user.click(screen.getByRole('button', { name: 'Remove secondary timber mark 1' }));
    expect(screen.getByRole('dialog')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('Secondary timber mark 1')).toBeTruthy();
  });
});
