import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/context/auth/AuthContext';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { ThemeContext } from '@/context/theme/ThemeContext';

import HeaderPanelProfile from './index';

import type { FamLoginUser } from '@/context/auth/types';
import type { CarbonTheme } from '@/context/preference/types';

vi.mock('@/components/Layout/AvatarImage', () => ({
  __esModule: true,
  default: ({ userName, size }: { userName: string; size: string }) => (
    <div data-testid="avatar-image">
      {userName}-{size}
    </div>
  ),
}));

const mockToggleTheme = vi.fn();
const mockLogout = vi.fn();
const mockUser: FamLoginUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  idpProvider: 'IDIR',
  userName: 'jdoe',
  email: 'jane@example.com',
} as FamLoginUser;

const mockAuthValue = {
  user: mockUser,
  isLoggedIn: true,
  isLoading: false,
  login: vi.fn(),
  logout: mockLogout,
  userToken: () => 'mock-token',
};

const mockWholeTheme = {
  theme: 'g100' as CarbonTheme,
  toggleTheme: mockToggleTheme,
  setTheme: vi.fn(),
};

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout, user: mockUser }),
}));
vi.mock('@/context/theme/useTheme', () => ({
  useTheme: () => ({ theme: 'g100', toggleTheme: mockToggleTheme }),
}));

const renderWithProviders = async () => {
  const qc = new QueryClient();
  await act(async () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <QueryClientProvider client={qc}>
          <PreferenceProvider>
            <ThemeContext.Provider value={mockWholeTheme}>
              <HeaderPanelProfile />
            </ThemeContext.Provider>
          </PreferenceProvider>
        </QueryClientProvider>
      </AuthContext.Provider>,
    );
  });
};

describe('HeaderPanelProfile', () => {
  it('renders user info and avatar', async () => {
    await renderWithProviders();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('IDIR\\jdoe')).toBeInTheDocument();
    expect(screen.getByText('Email: jane@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-initials')).toHaveTextContent('JD');
    expect(screen.getByTestId('user-fullname')).toHaveTextContent('Jane Doe');
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
