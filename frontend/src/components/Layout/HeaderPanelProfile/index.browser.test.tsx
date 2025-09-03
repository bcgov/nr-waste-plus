import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import ThemeProvider from '@/context/theme/ThemeProvider';

import HeaderPanelProfile from './index';

import type { FamLoginUser } from '@/context/auth/types';

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
const mockUser: FamLoginUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  idpProvider: 'IDIR',
  userName: 'jdoe',
  email: 'jane@example.com',
} as FamLoginUser;

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
  it('renders user info and avatar', async () => {
    await renderWithProviders();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('IDIR\\jdoe')).toBeInTheDocument();
    expect(screen.getByText('Email: jane@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-initials')).toHaveTextContent('Jane Doe-large');
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
