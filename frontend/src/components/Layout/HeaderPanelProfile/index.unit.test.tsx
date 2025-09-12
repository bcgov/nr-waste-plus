import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { Role, type FamLoginUser } from '@/context/auth/types';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import ThemeProvider from '@/context/theme/ThemeProvider';
import APIs from '@/services/APIs';

import HeaderPanelProfile from './index';

vi.mock('@/components/Layout/AvatarImage', () => ({
  __esModule: true,
  default: ({ userName, size }: { userName: string; size: string }) => (
    <div data-testid="avatar-initials">
      {userName}-{size}
    </div>
  ),
}));

const mockToggleTheme = vi.fn();
const mockLogout = vi.fn();
const mockClients = vi.fn().mockReturnValue(['client1', 'client2']);
const mockUser: FamLoginUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  idpProvider: 'IDIR',
  userName: 'jdoe',
  email: 'jane@example.com',
  roles: [{ role: Role.ADMIN, clients: ['client1', 'client2'] }],
} as FamLoginUser;

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout, user: mockUser, getClients: mockClients }),
}));
vi.mock('@/context/theme/useTheme', () => ({
  useTheme: () => ({ theme: 'g100', toggleTheme: mockToggleTheme }),
}));
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

const renderWithProviders = async () => {
  const qc = new QueryClient();
  await act(async () => {
    render(
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <PreferenceProvider>
            <ThemeProvider>
              <HeaderPanelProfile />
            </ThemeProvider>
          </PreferenceProvider>
        </QueryClientProvider>
      </AuthProvider>,
    );
  });
};

describe('HeaderPanelProfile', () => {
  beforeEach(() => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
  });

  it('renders user info and avatar', async () => {
    await renderWithProviders();
    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('IDIR\\jdoe')).toBeDefined();
    expect(screen.getByText('Email: jane@example.com')).toBeDefined();
    expect(screen.getByTestId('avatar-initials').textContent).to.equal('Jane Doe-large');
    expect(screen.getByTestId('user-fullname').textContent).to.equal('Jane Doe');
  });

  it('calls toggleTheme when Change theme is clicked', async () => {
    await renderWithProviders();
    fireEvent.click(screen.getByText('Change theme'));
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('calls logout when Log out is clicked', async () => {
    await renderWithProviders();
    fireEvent.click(screen.getByText('Log out'));
    expect(mockLogout).toHaveBeenCalled();
  });
});
