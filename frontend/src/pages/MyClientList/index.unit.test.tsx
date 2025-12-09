import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

import MyClientListPage from './index';

import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { sendEvent } from '@/hooks/useSendEvent/eventHandler';

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

const renderWithProps = async () => {
  const qc = new QueryClient();
  await act(() =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <MemoryRouter>
            <PageTitleProvider>
              <MyClientListPage />
            </PageTitleProvider>
          </MemoryRouter>
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('MyClientListPage', () => {
  it('renders My clients', () => {
    renderWithProps();
    expect(screen.getByText('My clients')).toBeDefined();
  });

  it('displays error notification when error event is sent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Error',
        description: 'This is a test error message',
        eventType: 'error',
        eventTarget: 'my-client-list',
      });
    });

    expect(screen.getByText('Test Error')).toBeDefined();
    expect(screen.getAllByText('This is a test error message')).toHaveLength(1);
  });

  it('displays warning notification when warning event is sent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Warning',
        description: 'This is a test warning message',
        eventType: 'warning',
        eventTarget: 'my-client-list',
      });
    });

    expect(screen.getByText('Test Warning')).toBeDefined();
    expect(screen.getAllByText('This is a test warning message')).toHaveLength(1);
  });

  it('displays info notification when info event is sent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Info',
        description: 'This is a test info message',
        eventType: 'info',
        eventTarget: 'my-client-list',
      });
    });

    expect(screen.getByText('Test Info')).toBeDefined();
    expect(screen.getAllByText('This is a test info message')).toHaveLength(1);
  });

  it('does not display notification when event target does not match', async () => {
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
