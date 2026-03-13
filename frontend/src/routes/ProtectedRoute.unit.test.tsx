import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, afterEach, it, expect } from 'vitest';

import ProtectedRoute from './ProtectedRoute';

import { Role } from '@/context/auth/types';
import * as useAuthModule from '@/context/auth/useAuth';

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => {
      mockNavigate(to);
      return null;
    },
  };
});

describe('ProtectedRoute', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('redirects to /login if user is not authenticated', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });

    const { container } = render(
      <MemoryRouter initialEntries={['/private']}>
        <ProtectedRoute>
          <div>Private Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    // Should render a Navigate component (no children rendered)
    expect(container.textContent).not.toContain('Private Content');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('redirects to /no-role when the user only has the provider marker role', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        idpProvider: 'IDIR',
        roles: [{ role: Role.IDIR, clients: [] }],
      },
    });

    render(
      <MemoryRouter initialEntries={['/private']}>
        <ProtectedRoute>
          <div>Private Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith('/no-role');
  });

  it('redirects to a role error when the user violates the access rules', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        idpProvider: 'BCEIDBUSINESS',
        roles: [
          { role: Role.BCeID, clients: [] },
          { role: Role.ADMIN, clients: [] },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={['/private']}>
        <ProtectedRoute>
          <div>Private Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith('/unauthorized?reason=BCEID_ASSIGNED_ROLES');
  });

  it('redirects to /unauthorized if user lacks required role', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        idpProvider: 'IDIR',
        roles: [
          { role: Role.IDIR, clients: [] },
          { role: Role.VIEWER, clients: ['100'] },
        ],
      },
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute roles={[{ role: Role.ADMIN, clients: [] }]}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(container.textContent).not.toContain('Admin Content');
    expect(mockNavigate).toHaveBeenCalledWith('/unauthorized');
  });

  it('renders children if user is authenticated and has required role', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        idpProvider: 'IDIR',
        roles: [
          { role: Role.IDIR, clients: [] },
          { role: Role.ADMIN, clients: [] },
        ],
      },
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute roles={[{ role: Role.ADMIN, clients: [] }]}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(getByText('Admin Content')).toBeTruthy();
  });

  it('renders children if user is authenticated and no roles are required', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        idpProvider: 'IDIR',
        roles: [
          { role: Role.IDIR, clients: [] },
          { role: Role.VIEWER, clients: ['100'] },
        ],
      },
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={['/private']}>
        <ProtectedRoute>
          <div>Private Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(getByText('Private Content')).toBeTruthy();
  });
});
