import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, type Mock, beforeEach, vi } from 'vitest';

import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

import WasteSearchPage from './index';
import { AuthProvider } from '@/context/auth/AuthProvider';

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
});
