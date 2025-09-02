import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';

import WasteSearchPage from './index';

const renderWithProps = async () => {
  const qc = new QueryClient();
  await act(() =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <MemoryRouter>
            <PageTitleProvider>
              <WasteSearchPage />
            </PageTitleProvider>
          </MemoryRouter>
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('WasteSearchPage', () => {
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
