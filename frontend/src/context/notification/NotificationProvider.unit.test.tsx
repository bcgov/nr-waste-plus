import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import NotificationProvider from './NotificationProvider';
import { useNotification } from './useNotification';

// Helper component to trigger notification
const TestComponent = () => {
  const { display, sendEvent } = useNotification();
  return (
    <>
      <button
        onClick={() =>
          display({
            title: 'Test Title',
            subtitle: 'Test Subtitle',
            caption: 'Test Caption',
            kind: 'success',
            timeout: 5000,
            onClose: vi.fn(),
            onCloseButtonClick: vi.fn(),
          })
        }
      >
        Show Notification
      </button>
      <button
        onClick={() =>
          sendEvent({
            title: 'Toast Targeted Event',
            description: 'Shows as toast despite scope',
            eventType: 'info',
            eventTarget: 'page-scope',
            displayMode: 'toast',
          })
        }
      >
        Show Targeted Toast Event
      </button>
      <button
        onClick={() =>
          sendEvent({
            title: 'Inline Global Event',
            description: 'Should not render as toast',
            eventType: 'info',
            displayMode: 'inline',
          })
        }
      >
        Show Global Inline Event
      </button>
    </>
  );
};

describe('NotificationProvider', () => {
  it('renders children', () => {
    render(
      <NotificationProvider>
        <div>Child</div>
      </NotificationProvider>,
    );
    screen.getByText('Child');
  });

  it('displays a notification when display is called', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );
    act(() => {
      screen.getByText('Show Notification').click();
    });
    screen.getByText('Test Title');
    screen.getByText('Test Subtitle');
    screen.getByText('Test Caption');
  });

  it('removes the notification when onClose is triggered', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );
    act(() => {
      screen.getByText('Show Notification').click();
    });
    // Simulate close by finding the close button and clicking it
    const closeBtn = screen.getByLabelText('closes notification');
    act(() => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    // Notification should be removed
    expect(screen.queryByText('Test Title')).toBeNull();
  });

  it('should fail if no provider is present', () => {
    expect(() => render(<TestComponent />)).toThrow(
      'useNotification must be used within a NotificationProvider',
    );
  });

  it('dedupes repeated notifications while one is active', () => {
    const DedupeTestComponent = () => {
      const { display } = useNotification();

      return (
        <button
          onClick={() => {
            display({
              title: 'Duplicate',
              subtitle: 'Only once',
              kind: 'info',
              timeout: 5000,
            });
            display({
              title: 'Duplicate',
              subtitle: 'Only once',
              kind: 'info',
              timeout: 5000,
            });
          }}
        >
          Show Duplicate Notification
        </button>
      );
    };

    render(
      <NotificationProvider>
        <DedupeTestComponent />
      </NotificationProvider>,
    );

    act(() => {
      screen.getByText('Show Duplicate Notification').click();
    });

    expect(screen.getAllByText('Duplicate')).toHaveLength(1);
  });

  it('renders a toast when event displayMode is toast', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    act(() => {
      screen.getByText('Show Targeted Toast Event').click();
    });

    screen.getByText('Toast Targeted Event');
    screen.getByText('Shows as toast despite scope');
  });

  it('does not render a toast when event displayMode is inline', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    act(() => {
      screen.getByText('Show Global Inline Event').click();
    });

    expect(screen.queryByText('Inline Global Event')).toBeNull();
    expect(screen.queryByText('Should not render as toast')).toBeNull();
  });
});
