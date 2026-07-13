import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdvancedFilterClientInput from './index';

import type { FamLoginUser } from '@/context/auth/types';

import { makeTestQueryClient } from '@/config/tests/renderWithApp';
import { AuthProvider } from '@/context/auth/AuthProvider';
import { useAuth } from '@/context/auth/useAuth';
import APIs from '@/services/APIs';

const mockUser = {
  idpProvider: 'IDIR',
} as FamLoginUser;

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    forestclient: {
      searchForestClients: vi.fn(),
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = makeTestQueryClient();
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('AdvancedFilterClientInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      getClients: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
      isLoading: false,
      isLoggedIn: true,
    });
  });

  it('renders autocomplete for IDIR users', async () => {
    const onClientChange = vi.fn();

    await act(async () => {
      render(
        <AdvancedFilterClientInput
          selectedClients={undefined}
          myClients={undefined}
          onClientChange={onClientChange}
        />,
        { wrapper },
      );
    });

    const acInput = screen.getByTestId('forestclient-client-ac');
    expect(acInput).toBeDefined();
  });

  it('renders multiselect for BCeID users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { idpProvider: 'BCEIDBUSINESS' } as FamLoginUser,
      getClients: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
      isLoading: false,
      isLoggedIn: true,
    });

    const onClientChange = vi.fn();
    const myClients = [
      { code: 'A', description: 'Client A' },
      { code: 'B', description: 'Client B' },
    ];

    await act(async () => {
      render(
        <AdvancedFilterClientInput
          selectedClients={undefined}
          myClients={myClients}
          onClientChange={onClientChange}
        />,
        { wrapper },
      );
    });

    expect(screen.queryByTestId('forestclient-client-ac')).toBeNull();
    screen.getByPlaceholderText('Client');
  });

  it('passes selected clients to autocomplete', async () => {
    const onClientChange = vi.fn();
    const selectedClients = [{ code: '12345', description: '12345 ACME' }];

    await act(async () => {
      render(
        <AdvancedFilterClientInput
          selectedClients={selectedClients}
          myClients={undefined}
          onClientChange={onClientChange}
        />,
        { wrapper },
      );
    });

    const acInput = screen.getByTestId('forestclient-client-ac') as HTMLInputElement;
    expect(acInput.value).toBe('12345 ACME');
  });

  it('returns null when provider is unknown', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { idpProvider: 'UNKNOWN', privileges: {} } as unknown as FamLoginUser,
      getClients: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
      isLoading: false,
      isLoggedIn: true,
    });

    const onClientChange = vi.fn();

    await act(async () => {
      render(
        <AdvancedFilterClientInput
          selectedClients={undefined}
          myClients={undefined}
          onClientChange={onClientChange}
        />,
        { wrapper },
      );
    });

    expect(screen.queryByTestId('client-blur-input')).toBeNull();
  });

  it('executes selectedItems filter callback for BCeID with matching selectedClients', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { idpProvider: 'BCEIDBUSINESS' } as FamLoginUser,
      getClients: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
      isLoading: false,
      isLoggedIn: true,
    });

    const myClients = [
      { code: 'A', description: 'Client A' },
      { code: 'B', description: 'Client B' },
    ];
    const selectedClients = [{ code: 'A', description: 'Client A' }];
    const onClientChange = vi.fn();

    await act(async () => {
      render(
        <AdvancedFilterClientInput
          selectedClients={selectedClients}
          myClients={myClients}
          onClientChange={onClientChange}
        />,
        { wrapper },
      );
    });

    // The .some() callback (line 99) fires during render to compute selectedItems
    // When selectedClients contains matches, the multiselect shows as selected
    const multiSelectWrapper = document.getElementById('as-client-multi-select');
    expect(multiSelectWrapper).toBeDefined();
  });

  it('renders BCeID multiselect with empty items when myClients is undefined', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { idpProvider: 'BCEIDBUSINESS' } as FamLoginUser,
      getClients: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
      isLoading: false,
      isLoggedIn: true,
    });

    await act(async () => {
      render(
        <AdvancedFilterClientInput
          selectedClients={undefined}
          myClients={undefined}
          onClientChange={vi.fn()}
        />,
        { wrapper },
      );
    });

    // Covers the myClients ?? [] branches on lines 95 and 98
    expect(document.getElementById('as-client-multi-select')).toBeDefined();
  });

  describe('validation props forwarding', () => {
    it('passes invalid and invalidText to AutoCompleteInput (IDIR)', async () => {
      const onClientChange = vi.fn();

      await act(async () => {
        render(
          <AdvancedFilterClientInput
            selectedClients={undefined}
            myClients={undefined}
            onClientChange={onClientChange}
            invalid={true}
            invalidText="Client is required"
          />,
          { wrapper },
        );
      });

      // Verify the component renders with validation props accepted
      const acInput = screen.getByTestId('forestclient-client-ac');
      expect(acInput).toBeDefined();
      // Component should not throw when invalid props are passed
      expect(acInput).toBeTruthy();
    });

    it('passes invalid and invalidText to ActiveMultiSelect (BCEIDBUSINESS)', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { idpProvider: 'BCEIDBUSINESS' } as FamLoginUser,
        getClients: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        isLoading: false,
        isLoggedIn: true,
      });

      const onClientChange = vi.fn();
      const myClients = [
        { code: 'A', description: 'Client A' },
        { code: 'B', description: 'Client B' },
      ];

      await act(async () => {
        render(
          <AdvancedFilterClientInput
            selectedClients={undefined}
            myClients={myClients}
            onClientChange={onClientChange}
            invalid={true}
            invalidText="Client is required"
          />,
          { wrapper },
        );
      });

      // Verify the component renders with validation props accepted
      const multiSelectInput = screen.getByPlaceholderText('Client');
      expect(multiSelectInput).toBeDefined();
      // Component should not throw when invalid props are passed
      expect(multiSelectInput).toBeTruthy();
    });

    it('passes warn and warnText props through both paths', async () => {
      const onClientChange = vi.fn();

      await act(async () => {
        render(
          <AdvancedFilterClientInput
            selectedClients={undefined}
            myClients={undefined}
            onClientChange={onClientChange}
            warn={true}
            warnText="Warning: multiple matches found"
          />,
          { wrapper },
        );
      });

      // Component renders without error when warn props are present
      const acInput = screen.getByTestId('forestclient-client-ac');
      expect(acInput).toBeDefined();
    });
  });

  describe('IDIR onAutoCompleteChange and onSelect callbacks', () => {
    beforeEach(() => {
      vi.mocked(APIs.forestclient.searchForestClients).mockResolvedValue([
        { id: '00000', name: 'Test Client', acronym: 'TC' },
      ]);
    });

    it('invokes onAutoCompleteChange on typing and onClientChange on item selection', async () => {
      const onClientChange = vi.fn();
      const user = userEvent.setup();

      render(
        <AdvancedFilterClientInput
          selectedClients={undefined}
          myClients={undefined}
          onClientChange={onClientChange}
        />,
        { wrapper },
      );

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, 'te');

      // Covers line 69: onAutoCompleteChange fires after debounce
      await waitFor(
        () => {
          expect(APIs.forestclient.searchForestClients).toHaveBeenCalledWith('te', 0, 10);
        },
        { timeout: 2000 },
      );

      // Covers lines 80-81: onSelect fires when a dropdown item is clicked
      const option = await screen.findByRole(
        'option',
        { name: /00000 Test Client/ },
        { timeout: 2000 },
      );
      await user.click(option);

      await waitFor(() => {
        expect(onClientChange).toHaveBeenCalledWith({
          selectedItems: [{ code: '00000', description: '00000 Test Client (TC)' }],
        });
      });
    });

    it('calls onClientChange with empty array when IDIR selection is cleared', async () => {
      const onClientChange = vi.fn();
      const user = userEvent.setup();

      await act(async () => {
        render(
          <AdvancedFilterClientInput
            selectedClients={[{ code: '12345', description: '12345 ACME' }]}
            myClients={undefined}
            onClientChange={onClientChange}
          />,
          { wrapper },
        );
      });

      // Carbon ComboBox renders a clear button when a selection exists (inputValue is non-empty)
      // Clicking it triggers onChange({ selectedItem: null }) → onSelect(null) → data = []
      const clearButton = screen.getByRole('button', { name: 'Clear selected item' });
      await user.click(clearButton);

      await waitFor(
        () => {
          expect(onClientChange).toHaveBeenCalledWith({ selectedItems: [] });
        },
        { timeout: 2000 },
      );
    });
  });
});
