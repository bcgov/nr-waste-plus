import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, type Mock, beforeEach, afterEach } from 'vitest';

import { PreferenceProvider } from './PreferenceProvider';
import { usePreference } from './usePreference';
import { loadUserPreference, saveUserPreference } from './utils';

const mockStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    reset: () => {
      store = {};
    },
  };
})();

vi.mock('@/context/preference/utils', () => ({
  loadUserPreference: vi.fn(),
  saveUserPreference: vi.fn(),
  initialValue: {
    theme: 'g10',
    testData: 'default',
  },
}));

const TestComponent = () => {
  const { userPreference, updatePreferences, isLoaded } = usePreference();

  return (
    <>
      <span data-testid="test-value">{userPreference.testData as string}</span>
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
  beforeEach(() => {
    mockStorage.reset();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockStorage.reset();
    mockStorage.clear();
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('provides the default userPreference', async () => {
    (loadUserPreference as Mock).mockResolvedValue({ theme: 'g10', testData: 'default' });
    await renderWithProviders();
    expect(screen.getByTestId('test-value').textContent).toBe('default');
  });

  it('updatePreferences changes the testData', async () => {
    (loadUserPreference as Mock)
      .mockReturnValueOnce({ theme: 'g10', testData: 'default' })
      .mockReturnValueOnce({ theme: 'g10', testData: 'g100' })
      .mockReturnValueOnce({ theme: 'g10', testData: 'g100' }); //for the refetch
    (saveUserPreference as Mock).mockResolvedValue({ theme: 'g10', testData: 'g100' });
    await renderWithProviders();

    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));

    expect(screen.getByTestId('test-value').textContent).toBe('default');
    await act(async () => fireEvent.click(screen.getByText('Set g100')));
    expect(saveUserPreference).toHaveBeenCalled();
    expect(loadUserPreference).toHaveBeenCalledTimes(3);

    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
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
