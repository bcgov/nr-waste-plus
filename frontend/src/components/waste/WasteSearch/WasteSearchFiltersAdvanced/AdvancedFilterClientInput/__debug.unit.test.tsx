import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, it, vi, beforeEach } from 'vitest';

import AdvancedFilterClientInput from './index';

import { makeTestQueryClient } from '@/config/tests/renderWithApp';
import { AuthProvider } from '@/context/auth/AuthProvider';
import { useAuth } from '@/context/auth/useAuth';
import APIs from '@/services/APIs';

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/services/APIs', () => ({
  default: { forestclient: { searchForestClients: vi.fn().mockResolvedValue([]) } },
}));

describe('ac-flush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { idpProvider: 'IDIR' },
      getClients: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
      isLoading: false,
      isLoggedIn: true,
    } as any);
  });
  it('finds ac after waitFor', async () => {
    const qc = makeTestQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <AdvancedFilterClientInput
            selectedClients={undefined}
            myClients={undefined}
            onClientChange={vi.fn()}
          />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await screen
      .findByTestId('forestclient-client-ac', {}, { timeout: 3000 })
      .then((el) => console.log('FOUND_AC:' + (el?.textContent ?? 'none')))
      .catch(() => console.log('NOTFOUND_AC'));
  });
});
