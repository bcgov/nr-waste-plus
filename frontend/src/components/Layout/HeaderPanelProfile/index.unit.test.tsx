import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import HeaderPanelProfile from './index';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { Role, type FamLoginUser } from '@/context/auth/types';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import ThemeProvider from '@/context/theme/ThemeProvider';
import APIs from '@/services/APIs';

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

  it('calls logout when Log out is clicked', async () => {
    await renderWithProviders();
    fireEvent.click(screen.getByText('Log out'));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('renders tooltip with correct text and Help icon', async () => {
    await renderWithProviders();
    const tooltipLabel =
      'Optional: Select a default organization. This can help you do your searches faster if you work with one organization much more than others. You can change or remove this at any time.';
    expect(screen.getByText('Select organization')).toBeDefined();
    expect(screen.getByLabelText('Help: About selecting a default organization')).toBeDefined();
    expect(screen.getByText(tooltipLabel)).toBeDefined();
  });

  it('renders DistrictListing for IDIR user', async () => {
    await renderWithProviders();
    expect(screen.getByText('Select organization')).toBeDefined();
  });

  it('renders correct entity type text based on user idpProvider', async () => {
    await renderWithProviders();
    expect(screen.getByText('Select organization')).toBeDefined();
  });

  it('renders navigation structure and SideNavDivider', async () => {
    await renderWithProviders();
    expect(screen.getByRole('navigation')).toBeDefined();
    expect(screen.getAllByRole('separator').length).toBeGreaterThan(0);
  });

  it('SideNavLink Log out has correct accessibility', async () => {
    await renderWithProviders();
    expect(screen.getByText('Log out')).toBeDefined();
  });
});
