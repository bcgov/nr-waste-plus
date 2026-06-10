import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdvancedFilterClientInput from './index';

import type { FamLoginUser } from '@/context/auth/types';

import { makeTestQueryClient } from '@/config/tests/renderWithApp';
import { AuthProvider } from '@/context/auth/AuthProvider';
import { useAuth } from '@/context/auth/useAuth';

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

describe('onBlur callback', () => {
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
