import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdvancedFilterClientInput from './AdvancedFilterClientInput';

import type { FamLoginUser } from '@/context/auth/types';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { useAuth } from '@/context/auth/useAuth';

const mockUser = {
  idpProvider: 'IDIR',
} as FamLoginUser;

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient();
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
    expect(document.querySelector('#as-client-multi-select')).toBeDefined();
    expect(screen.getByPlaceholderText('Client')).toBeDefined();
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

    let container: HTMLElement | null = null;

    await act(async () => {
      const result = render(
        <AdvancedFilterClientInput
          selectedClients={undefined}
          myClients={undefined}
          onClientChange={onClientChange}
        />,
        { wrapper },
      );
      container = result.container;
    });

    expect(container).toBeDefined();
    expect(container!.firstChild).toBeNull();
  });

  describe('onBlur callback', () => {
    it('calls onBlur when AutoCompleteInput loses focus (IDIR)', async () => {
      const onClientChange = vi.fn();
      const onBlur = vi.fn();

      await act(async () => {
        render(
          <AdvancedFilterClientInput
            selectedClients={undefined}
            myClients={undefined}
            onClientChange={onClientChange}
            onBlur={onBlur}
          />,
          { wrapper },
        );
      });

      const acInput = screen.getByTestId('forestclient-client-ac');
      expect(acInput).toBeDefined();

      await act(async () => {
        const user = userEvent.setup();
        await user.click(acInput);
        await user.tab();
      });

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when ActiveMultiSelect loses focus (BCEIDBUSINESS)', async () => {
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
      const onBlur = vi.fn();
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
            onBlur={onBlur}
          />,
          { wrapper },
        );
      });

      const multiSelectInput = screen.getByPlaceholderText('Client');
      expect(multiSelectInput).toBeDefined();

      await act(async () => {
        const user = userEvent.setup();
        await user.click(multiSelectInput);
        await user.tab();
      });

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('does not call onBlur when onBlur is not provided (IDIR)', async () => {
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

      await act(async () => {
        const user = userEvent.setup();
        await user.click(acInput);
        await user.tab();
      });

      // Component should render without error even without onBlur
      expect(acInput).toBeDefined();
    });

    it('does not call onBlur when onBlur is not provided (BCEIDBUSINESS)', async () => {
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

      const multiSelectInput = screen.getByPlaceholderText('Client');

      await act(async () => {
        const user = userEvent.setup();
        await user.click(multiSelectInput);
        await user.tab();
      });

      // Component should render without error even without onBlur
      expect(multiSelectInput).toBeDefined();
    });
  });
});
