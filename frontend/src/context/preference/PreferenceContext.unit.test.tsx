import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, it, expect, vi, type Mock } from 'vitest';

import { PreferenceProvider } from './PreferenceProvider';
import { usePreference } from './usePreference';
import { loadUserPreference, saveUserPreference } from './utils';

vi.mock('@/context/preference/utils', () => {
  return {
    loadUserPreference: vi.fn(),
    saveUserPreference: vi.fn(),
    initialValue: {
      theme: 'g10',
      testData: 'default',
    },
  };
});

const TestComponent = () => {
  const { userPreference, updatePreferences, isLoaded } = usePreference();
  const [testData, setTestData] = useState<string>(
    (userPreference.testData as string) || 'default',
  );

  useEffect(() => {
    if (userPreference.testData) {
      setTestData(userPreference.testData as string);
    }
  }, [userPreference.testData]);

  return (
    <>
      <span data-testid="test-value">{testData}</span>
      <span data-testid="loaded">{String(isLoaded)}</span>
      <button onClick={() => updatePreferences({ testData: 'g100' })}>Set g100</button>
    </>
  );
};

const renderWithProviders = async () => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <TestComponent />
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('PreferenceContext', () => {
  it('provides the default userPreference', async () => {
    (loadUserPreference as Mock).mockResolvedValue({ theme: 'g10', testData: 'default' });
    await renderWithProviders();
    expect(screen.getByTestId('test-value').textContent).toBe('default');
  });

  it('updatePreferences changes the testData', async () => {
    // Provide a stable initial load value. Multiple invocations (e.g. React StrictMode
    // or react-query refetches) will all return this same value to avoid flakiness.
    (loadUserPreference as Mock).mockResolvedValue({ theme: 'g10', testData: 'default' });
    (saveUserPreference as Mock).mockResolvedValue({ theme: 'g10', testData: 'g100' });
    await renderWithProviders();
    // Ensure the provider has loaded preferences (not just using mocked initialValue fallback)
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('test-value').textContent).toBe('default');
    await act(async () => screen.getByText('Set g100').click());
    await waitFor(() => {
      expect(screen.getByTestId('test-value').textContent).toBe('g100');
    });
  });

  it('throws if usePreference is used outside of PreferenceProvider', async () => {
    expect(() => render(<TestComponent />)).toThrow(
      'usePreference must be used within a PreferenceProvider',
    );
  });
});
