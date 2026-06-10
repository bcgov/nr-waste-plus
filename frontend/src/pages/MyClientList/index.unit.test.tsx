import { act, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import MyClientListPage from './index';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
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

const renderWithProps = () => renderWithAppAsync(<MyClientListPage />);

describe('MyClientListPage', () => {
  it('should render my clients when rendered', async () => {
    await renderWithProps();
    await waitFor(() => {
      screen.getByText('My clients');
    });
  });

  it('should display error notification when error event sent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Error',
        description: 'This is a test error message',
        eventType: 'error',
        eventTarget: 'my-client-list',
      });
    });

    screen.getByText('Test Error');
    expect(screen.getAllByText('This is a test error message')).toHaveLength(1);
  });

  it('should display warning notification when warning event sent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Warning',
        description: 'This is a test warning message',
        eventType: 'warning',
        eventTarget: 'my-client-list',
      });
    });

    screen.getByText('Test Warning');
    expect(screen.getAllByText('This is a test warning message')).toHaveLength(1);
  });

  it('should display info notification when info event sent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Info',
        description: 'This is a test info message',
        eventType: 'info',
        eventTarget: 'my-client-list',
      });
    });

    screen.getByText('Test Info');
    expect(screen.getAllByText('This is a test info message')).toHaveLength(1);
  });

  it('should not display notification when event target does not match', async () => {
    await renderWithProps();

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
