import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AnnouncerProvider } from './AnnouncerProvider';
import { useAnnouncer } from './useAnnouncer';

const TestComponent = () => {
  const { announce } = useAnnouncer();
  return (
    <div>
      <button onClick={() => announce('Hello screen reader')}>Announce</button>
      <button onClick={() => announce('Hello screen reader')}>Announce again</button>
      <button
        onClick={() => {
          announce('Dark mode enabled');
          announce('Profile panel closed');
        }}
      >
        Announce both
      </button>
    </div>
  );
};

const getAnnouncer = () => screen.getByTestId('app-announcer');

describe('AnnouncerProvider', () => {
  it('renders a persistent polite live region that starts empty', () => {
    render(
      <AnnouncerProvider>
        <TestComponent />
      </AnnouncerProvider>,
    );
    const region = getAnnouncer();
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(region.textContent).toBe('');
  });

  it('announce writes the message into the live region', async () => {
    const user = userEvent.setup();
    render(
      <AnnouncerProvider>
        <TestComponent />
      </AnnouncerProvider>,
    );
    await user.click(screen.getByText('Announce'));
    await waitFor(() => expect(getAnnouncer().textContent).toBe('Hello screen reader'));
  });

  it('re-announces an identical consecutive message (clear-then-set)', async () => {
    const user = userEvent.setup();
    render(
      <AnnouncerProvider>
        <TestComponent />
      </AnnouncerProvider>,
    );
    await user.click(screen.getByText('Announce'));
    await waitFor(() => expect(getAnnouncer().textContent).toBe('Hello screen reader'));
    // Clear the region, then publish the same text again — the text node must
    // change (empty, then message) so screen readers re-announce it.
    await user.click(screen.getByText('Announce again'));
    await waitFor(() => expect(getAnnouncer().textContent).toBe(''));
    await waitFor(() => expect(getAnnouncer().textContent).toBe('Hello screen reader'));
  });

  it('queues synchronous announcements so none are lost', async () => {
    const user = userEvent.setup();
    render(
      <AnnouncerProvider>
        <TestComponent />
      </AnnouncerProvider>,
    );
    // One interaction can publish twice (e.g. theme toggle + outside-click
    // closing the profile panel). Both messages must reach the region in
    // order; last-write-wins would drop the first one.
    await user.click(screen.getByText('Announce both'));
    await waitFor(() => expect(getAnnouncer().textContent).toBe('Dark mode enabled'));
    await waitFor(() => expect(getAnnouncer().textContent).toBe('Profile panel closed'), {
      timeout: 2000,
    });
  });

  it('throws if useAnnouncer is used outside of an AnnouncerProvider', () => {
    expect(() => render(<TestComponent />)).toThrow(
      'useAnnouncer must be used within an AnnouncerProvider',
    );
  });
});
