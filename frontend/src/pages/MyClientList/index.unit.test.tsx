import { act, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import MyClientListPage from './index';

import { renderWithApp } from '@/config/tests/renderWithApp';
import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

vi.mock('@/services/APIs', () => {
  return {
    default: {
      user: {
        getUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
      },
    },
  };
});

/**
 * Sync render helper that wraps render in act() so the RouterProvider's
 * (Transitioner) mount-time state updates are flushed inside the act
 * environment.
 *
 * Using sync act() (not async/await) avoids the V8-coverage hang that
 * afflicts renderWithAppAsync — see issue #1130.
 *
 * Use `await screen.findByText()` after render to wait for the router to
 * resolve and the page content to appear.
 */
// eslint-disable-next-line testing-library/no-unnecessary-act
const renderWithProps = () => act(() => renderWithApp(<MyClientListPage />));

describe('MyClientListPage', () => {
  it('should render my clients when rendered', async () => {
    renderWithProps();
    await screen.findByText('My clients');
  });

  it('should display error notification when error event sent', async () => {
    renderWithProps();

    // Wait for the router to resolve and page content to render
    // before sending events so NotificationProvider is fully mounted.
    await screen.findByText('My clients');

    act(() => {
      sendEvent({
        title: 'Test Error',
        description: 'This is a test error message',
        eventType: 'error',
        eventTarget: 'my-client-list',
      });
    });

    await screen.findByText('Test Error');
    await screen.findByText('This is a test error message');
  });

  it('should display warning notification when warning event sent', async () => {
    renderWithProps();

    await screen.findByText('My clients');

    act(() => {
      sendEvent({
        title: 'Test Warning',
        description: 'This is a test warning message',
        eventType: 'warning',
        eventTarget: 'my-client-list',
      });
    });

    await screen.findByText('Test Warning');
    await screen.findByText('This is a test warning message');
  });

  it('should display info notification when info event sent', async () => {
    renderWithProps();

    await screen.findByText('My clients');

    act(() => {
      sendEvent({
        title: 'Test Info',
        description: 'This is a test info message',
        eventType: 'info',
        eventTarget: 'my-client-list',
      });
    });

    await screen.findByText('Test Info');
    await screen.findByText('This is a test info message');
  });

  it('should not display notification when event target does not match', async () => {
    renderWithProps();

    await screen.findByText('My clients');

    act(() => {
      sendEvent({
        title: 'Different Target Error',
        description: 'This should not be displayed',
        eventType: 'error',
        eventTarget: 'different-target',
      });
    });

    expect(screen.queryByText('Different Target Error')).toBeNull();
    expect(screen.queryByText('This should not be displayed')).toBeNull();
  });
});
