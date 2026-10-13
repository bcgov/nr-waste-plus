import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { dispatchNotificationEvent } from '@/context/notification/eventBridge';
import NotificationProvider from '@/context/notification/NotificationProvider';

import NotificationsPanel from './NotificationsPanel';

const renderPanel = () =>
  render(
    <NotificationProvider>
      <NotificationsPanel />
    </NotificationProvider>,
  );

const fireToastEvent = () => {
  act(() => {
    dispatchNotificationEvent({
      title: 'Toast Event',
      description: 'Shows as a toast',
      eventType: 'info',
    });
  });
};

const fireInlineEvent = () => {
  act(() => {
    dispatchNotificationEvent({
      title: 'Inline Event',
      description: 'Scoped inline event',
      eventType: 'warning',
      eventTarget: 'page-scope',
    });
  });
};

describe('NotificationsPanel', () => {
  it('lists a toast-mode event in the live queue and the event log', async () => {
    renderPanel();
    fireToastEvent();

    const queueSection = await screen.findByRole('region', { name: 'Live toast queue' });
    expect(within(queueSection).getByText('Toast Event')).toBeDefined();
    expect(within(queueSection).getByText(/Shows as a toast/)).toBeDefined();

    const logSection = screen.getByRole('region', { name: 'Notification event log' });
    expect(within(logSection).getByText(/info: Toast Event/)).toBeDefined();
  });

  it('keeps inline events out of the toast queue', () => {
    renderPanel();
    fireInlineEvent();

    const queueSection = screen.getByRole('region', { name: 'Live toast queue' });
    expect(within(queueSection).getByText('No queued notifications.')).toBeDefined();

    const logSection = screen.getByRole('region', { name: 'Notification event log' });
    expect(within(logSection).getByText(/warning: Inline Event/)).toBeDefined();
  });

  it('re-fires a logged event and records the repeat', async () => {
    const user = userEvent.setup();
    renderPanel();
    fireInlineEvent();

    const logSection = screen.getByRole('region', { name: 'Notification event log' });
    await user.click(within(logSection).getByRole('button', { name: 'Re-fire event Inline Event' }));

    await waitFor(() => {
      expect(within(logSection).getAllByRole('listitem')).toHaveLength(2);
    });
  });

  it('re-fires a queued toast and the queue stays deduplicated', async () => {
    const user = userEvent.setup();
    renderPanel();
    fireToastEvent();

    const queueSection = await screen.findByRole('region', { name: 'Live toast queue' });
    const logSection = screen.getByRole('region', { name: 'Notification event log' });

    await user.click(within(queueSection).getByRole('button', { name: 'Re-fire notification Toast Event' }));

    await waitFor(() => {
      expect(within(logSection).getAllByRole('listitem')).toHaveLength(2);
    });
    expect(within(queueSection).getAllByRole('listitem')).toHaveLength(1);
  });
});
