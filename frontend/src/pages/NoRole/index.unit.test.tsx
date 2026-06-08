import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import NoRolePage from './index';

import type { FamLoginUser } from '@/context/auth/types';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import { Role } from '@/context/auth/types';
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

const renderWithProps = () => renderWithAppAsync(<NoRolePage />);

describe('NoRolePage', () => {
  beforeEach(() => {
    mockIsLoggedIn = false;
    mockUser = null;
    mockNavigate.mockClear();
    vi.mocked(APIs.user.getUserPreferences).mockResolvedValue({ theme: 'g10' });
    vi.mocked(APIs.user.updateUserPreferences).mockResolvedValue(undefined);
  });

  it('shouldNavigateToHome_whenUserIsNotLoggedIn', async () => {
    mockIsLoggedIn = false;
    mockUser = null;
    await renderWithProps();
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/' }));
    expect(screen.queryByText('Unauthorized Access')).toBeNull();
  });

  it('shouldNavigateToHome_whenLoggedInButUserNotLoaded', async () => {
    mockIsLoggedIn = true;
    mockUser = null;
    await renderWithProps();
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/' }));
    expect(screen.queryByText('Unauthorized Access')).toBeNull();
  });

  it('shouldNavigateToHome_whenLoggedInUserHasRoles', async () => {
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

  it('shouldRenderUnauthorizedMessage_whenUserHasNoRoles', async () => {
    mockIsLoggedIn = true;
    mockUser = {
      userName: 'testuser',
      displayName: 'Test User',
      roles: [],
      privileges: {},
    };
    await renderWithProps();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/' }));
    screen.getByText('Unauthorized Access');
    expect(
      screen.getByText("You don't have FAM authorization to access this system"),
    ).toBeDefined();
  });

  it('shouldRenderUnauthorizedMessage_whenUserHasUndefinedRoles', async () => {
    mockIsLoggedIn = true;
    mockUser = {
      userName: 'testuser',
      displayName: 'Test User',
      roles: undefined,
      privileges: {},
    };
    await renderWithProps();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/' }));
    screen.getByText('Unauthorized Access');
    expect(
      screen.getByText("You don't have FAM authorization to access this system"),
    ).toBeDefined();
  });

  it('shouldRenderUnauthorizedMessage_whenUserOnlyHasProviderMarkerRole', async () => {
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
    screen.getByText('Unauthorized Access');
    expect(
      screen.getByText("You don't have FAM authorization to access this system"),
    ).toBeDefined();
  });
});
