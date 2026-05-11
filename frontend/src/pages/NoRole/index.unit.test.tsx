import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import NoRolePage from './index';

import type { FamLoginUser } from '@/context/auth/types';

import { Role } from '@/context/auth/types';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

let mockIsLoggedIn = false;
let mockUser: FamLoginUser | null = null;

const mockNavigate = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: mockIsLoggedIn,
    user: mockUser,
  }),
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

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithProps = async () => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <PageTitleProvider>
            <NoRolePage />
          </PageTitleProvider>
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('NoRolePage', () => {
  beforeEach(() => {
    mockIsLoggedIn = false;
    mockUser = null;
    mockNavigate.mockClear();
    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
  });

  it('navigates to home when user is not logged in', async () => {
    mockIsLoggedIn = false;
    mockUser = null;
    await renderWithProps();
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/' }));
    expect(screen.queryByText('Unauthorized Access')).toBeNull();
  });

  it('navigates to home when logged in but user is not loaded', async () => {
    mockIsLoggedIn = true;
    mockUser = null;
    await renderWithProps();
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/' }));
    expect(screen.queryByText('Unauthorized Access')).toBeNull();
  });

  it('navigates to home when logged in user has roles', async () => {
    mockIsLoggedIn = true;
    mockUser = {
      userName: 'testuser',
      displayName: 'Test User',
      roles: [{ role: Role.VIEWER, clients: [] }],
      privileges: {},
    };

    await renderWithProps();

    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/' }));
    expect(screen.queryByText('Unauthorized Access')).toBeNull();
  });

  it('renders unauthorized access message when logged in user has no roles', async () => {
    mockIsLoggedIn = true;
    mockUser = {
      userName: 'testuser',
      displayName: 'Test User',
      roles: [],
      privileges: {},
    };
    await renderWithProps();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/' }));
    expect(screen.getByText('Unauthorized Access')).toBeDefined();
    expect(
      screen.getByText("You don't have FAM authorization to access this system"),
    ).toBeDefined();
  });

  it('renders unauthorized access message when logged in user has undefined roles', async () => {
    mockIsLoggedIn = true;
    mockUser = {
      userName: 'testuser',
      displayName: 'Test User',
      roles: undefined,
      privileges: {},
    };
    await renderWithProps();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/' }));
    expect(screen.getByText('Unauthorized Access')).toBeDefined();
    expect(
      screen.getByText("You don't have FAM authorization to access this system"),
    ).toBeDefined();
  });

  it('renders unauthorized access message when the user only has a provider marker role', async () => {
    mockIsLoggedIn = true;
    mockUser = {
      userName: 'testuser',
      displayName: 'Test User',
      idpProvider: 'BCEIDBUSINESS',
      roles: [{ role: Role.BCeID, clients: [] }],
      privileges: {},
    };

    await renderWithProps();

    expect(mockNavigate).not.toHaveBeenCalledWith('/');
    expect(screen.getByText('Unauthorized Access')).toBeDefined();
    expect(
      screen.getByText("You don't have FAM authorization to access this system"),
    ).toBeDefined();
  });
});
