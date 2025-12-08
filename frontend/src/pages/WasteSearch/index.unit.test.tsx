import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, type Mock, beforeEach, vi } from 'vitest';

import WasteSearchPage from './index';

import { AuthProvider } from '@/context/auth/AuthProvider';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { sendEvent } from '@/hooks/useSendEvent/eventHandler';
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
          <MemoryRouter>
            <AuthProvider>
              <PageTitleProvider>
                <WasteSearchPage />
              </PageTitleProvider>
            </AuthProvider>
          </MemoryRouter>
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('WasteSearchPage', () => {
  beforeEach(() => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
    (APIs.codes.getSamplingOptions as Mock).mockResolvedValue([]);
    (APIs.codes.getDistricts as Mock).mockResolvedValue([]);
    (APIs.codes.getAssessAreaStatuses as Mock).mockResolvedValue([]);
    (APIs.search.searchReportingUnit as Mock).mockResolvedValue({
      content: [],
      page: {
        number: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
      },
    });
  });

  it('renders the page title and subtitle', async () => {
    await renderWithProps();
    expect(screen.getByText('Waste search')).toBeDefined();
    expect(screen.getByText('Search for reporting units, licensees, or blocks')).toBeDefined();
  });

  it('renders the WasteSearch columns', async () => {
    await renderWithProps();
    expect(screen.getByText('Nothing to show yet!')).toBeDefined();
  });

  it('displays error notification when error event is sent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Error',
        description: 'This is a test error message',
        eventType: 'error',
        eventTarget: 'waste-search',
      });
    });

    expect(screen.getByText('Test Error')).toBeDefined();
    expect(screen.getAllByText('This is a test error message')).toHaveLength(2);
  });

  it('displays warning notification when warning event is sent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Warning',
        description: 'This is a test warning message',
        eventType: 'warning',
        eventTarget: 'waste-search',
      });
    });

    expect(screen.getByText('Test Warning')).toBeDefined();
    expect(screen.getAllByText('This is a test warning message')).toHaveLength(2);
  });

  it('displays info notification when info event is sent', async () => {
    await renderWithProps();

    act(() => {
      sendEvent({
        title: 'Test Info',
        description: 'This is a test info message',
        eventType: 'info',
        eventTarget: 'waste-search',
      });
    });

    await waitFor(() => expect(screen.getByText('Test Info')).toBeDefined());
    expect(screen.getAllByText('This is a test info message')).toHaveLength(2);
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
