import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { withProtected } from './withProtected';

import type { FamLoginUser } from '@/context/auth/types';

import { Role } from '@/context/auth/types';

// ── Mutable state controlled by each test ────────────────────────────────────
let mockUser: FamLoginUser | undefined;
let mockIsLoading = false;
const mockNavigate = vi.fn();
let mockPathname = '/search';
let mockSearchStr = '';

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isLoading: mockIsLoading }),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useRouterState: ({
      select,
    }: {
      select: (s: { location: { pathname: string; searchStr: string } }) => unknown;
    }) => select({ location: { pathname: mockPathname, searchStr: mockSearchStr } }),
  };
});

vi.mock('@/routes/redirectStorage', () => ({
  persistRedirectUrl: vi.fn(),
}));

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function DummyPage() {
  return <div data-testid="dummy-page">Content</div>;
}

const makeUser = (overrides: Partial<FamLoginUser> = {}): FamLoginUser => ({
  userName: 'testuser',
  displayName: 'Test User',
  idpProvider: 'BCEIDBUSINESS',
  roles: [{ role: Role.VIEWER, clients: ['100'] }],
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('withProtected', () => {
  beforeEach(() => {
    mockUser = undefined;
    mockIsLoading = false;
    mockPathname = '/search';
    mockSearchStr = '';
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it('shouldSetDisplayName_whenWrapping', () => {
    const Protected = withProtected(DummyPage);
    expect(Protected.displayName).toBe('withProtected(DummyPage)');
  });

  it('shouldRenderLoadingOverlay_whenAuthIsLoading', async () => {
    mockIsLoading = true;
    mockUser = undefined;
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    expect(screen.getByTestId('loading')).toBeDefined();
    expect(screen.queryByTestId('dummy-page')).toBeNull();
  });

  it('shouldRenderLoadingOverlay_whenUserIsUndefined', async () => {
    mockIsLoading = false;
    mockUser = undefined;
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    expect(screen.getByTestId('loading')).toBeDefined();
  });

  it('shouldPersistRedirectAndNavigateToLogin_whenUserIsUndefined', async () => {
    const { persistRedirectUrl } = await import('@/routes/redirectStorage');
    mockIsLoading = false;
    mockUser = undefined;
    mockPathname = '/search';
    mockSearchStr = '?q=test';
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    expect(vi.mocked(persistRedirectUrl)).toHaveBeenCalledWith('/search?q=test');
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/login', replace: true }),
    );
  });

  it('shouldNotPersistRedirect_whenPathnameIsLogin', async () => {
    const { persistRedirectUrl } = await import('@/routes/redirectStorage');
    mockIsLoading = false;
    mockUser = undefined;
    mockPathname = '/login';
    mockSearchStr = '';
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    expect(vi.mocked(persistRedirectUrl)).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/login' }));
  });

  it('shouldRenderComponent_whenUserIsAuthenticated', async () => {
    mockIsLoading = false;
    mockUser = makeUser();
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    expect(screen.getByTestId('dummy-page')).toBeDefined();
  });

  it('shouldRedirectToNoRole_whenUserHasNoRoles', async () => {
    const { navigateInTree } = await import('@/routes/inTreePaths');
    mockIsLoading = false;
    mockUser = makeUser({ roles: [] });
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
      mockNavigate,
      '/no-role',
      expect.objectContaining({ replace: true }),
    );
  });

  it('shouldRedirectToUnauthorized_whenUserLacksRequiredRole', async () => {
    const { navigateInTree } = await import('@/routes/inTreePaths');
    mockIsLoading = false;
    mockUser = makeUser({ roles: [{ role: Role.VIEWER, clients: ['100'] }] });
    const Protected = withProtected(DummyPage, [{ role: Role.ADMIN, clients: [] }]);
    await act(async () => render(<Protected />));
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
      mockNavigate,
      '/unauthorized',
      expect.objectContaining({ replace: true }),
    );
  });

  it('shouldRenderComponent_whenUserHasMatchingRole', async () => {
    mockIsLoading = false;
    mockUser = makeUser({ roles: [{ role: Role.VIEWER, clients: ['100'] }] });
    const Protected = withProtected(DummyPage, [{ role: Role.VIEWER, clients: [] }]);
    await act(async () => render(<Protected />));
    expect(screen.getByTestId('dummy-page')).toBeDefined();
  });

  it('shouldRenderComponent_whenRolesArrayIsEmpty', async () => {
    mockIsLoading = false;
    mockUser = makeUser({ roles: [{ role: Role.VIEWER, clients: ['100'] }] });
    const Protected = withProtected(DummyPage, []);
    await act(async () => render(<Protected />));
    expect(screen.getByTestId('dummy-page')).toBeDefined();
  });

  it('shouldUseComponentName_forDisplayName_whenDisplayNameIsMissing', () => {
    function NamedComp() {
      return null;
    }
    const Protected = withProtected(NamedComp);
    expect(Protected.displayName).toBe('withProtected(NamedComp)');
  });

  it('shouldUseFallbackName_forDisplayName_whenBothMissing', () => {
    const anon = (() => null) as React.ComponentType;
    const Protected = withProtected(anon);
    expect(Protected.displayName).toContain('withProtected(');
  });

  it('shouldRedirectToRoleError_whenUserHasRoleErrorStatus', async () => {
    const { navigateInTree } = await import('@/routes/inTreePaths');
    mockIsLoading = false;
    // IDIR user with multiple roles triggers role-error
    mockUser = makeUser({
      idpProvider: 'IDIR',
      roles: [
        { role: Role.VIEWER, clients: ['100'] },
        { role: Role.SUBMITTER, clients: ['200'] },
      ],
    });
    mockPathname = '/search';
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    expect(vi.mocked(navigateInTree)).toHaveBeenCalled();
  });
});
