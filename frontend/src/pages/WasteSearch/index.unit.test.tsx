import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import WasteSearchPage from './index';

import { createTestRouter } from '@/config/tests/routerTestHelper';
import { AuthProvider } from '@/context/auth/AuthProvider';
import NotificationProvider from '@/context/notification/NotificationProvider';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';
import APIs from '@/services/APIs';

vi.mock('@/services/APIs', () => {
  return {
    default: {
      user: {
        getUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
      },
      codes: {
        getSamplingOptions: vi.fn(),
        getDistricts: vi.fn(),
        getAssessAreaStatuses: vi.fn(),
      },
      search: {
        searchReportingUnit: vi.fn(),
      },
    },
  };
});

const renderWithProps = async () => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <RouterProvider
            router={createTestRouter(() => (
              <AuthProvider>
                <NotificationProvider>
                  <PageTitleProvider>
                    <WasteSearchPage />
                  </PageTitleProvider>
                </NotificationProvider>
              </AuthProvider>
            ))}
          />
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('WasteSearchPage', () => {
  beforeEach(() => {
    vi.mocked(APIs.user.getUserPreferences).mockResolvedValue({ theme: 'g10' });
    vi.mocked(APIs.user.updateUserPreferences).mockResolvedValue(undefined);
    vi.mocked(APIs.codes.getSamplingOptions).mockResolvedValue([]);
    vi.mocked(APIs.codes.getDistricts).mockResolvedValue([]);
    vi.mocked(APIs.codes.getAssessAreaStatuses).mockResolvedValue([]);
    vi.mocked(APIs.search.searchReportingUnit).mockResolvedValue({
      content: [],
      page: {
        number: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
      },
    });
  });

  it('shouldRenderPageTitleAndSubtitle_whenRendered', async () => {
    await renderWithProps();
    screen.getByText('Waste search');
    screen.getByText('Search for reporting units, licensees, or blocks');
  });

  it('shouldRenderWasteSearchColumns_whenRendered', async () => {
    await renderWithProps();
    screen.getByText('Nothing to show yet!');
  });

  it('shouldDisplayErrorNotification_whenErrorEventSent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Error',
        description: 'This is a test error message',
        eventType: 'error',
        eventTarget: 'waste-search',
      });
    });

    screen.getByText('Test Error');
    expect(screen.getAllByText('This is a test error message')).toHaveLength(1);
  });

  it('shouldDisplayWarningNotification_whenWarningEventSent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Warning',
        description: 'This is a test warning message',
        eventType: 'warning',
        eventTarget: 'waste-search',
      });
    });

    screen.getByText('Test Warning');
    expect(screen.getAllByText('This is a test warning message')).toHaveLength(1);
  });

  it('shouldDisplayInfoNotification_whenInfoEventSent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Info',
        description: 'This is a test info message',
        eventType: 'info',
        eventTarget: 'waste-search',
      });
    });

    await screen.findByText('Test Info');
    expect(screen.getAllByText('This is a test info message')).toHaveLength(1);
  });

  it('shouldNotDisplayNotification_whenEventTargetDoesNotMatch', async () => {
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
