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
  privileges: {},
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

  it('should set display name when wrapping', () => {
    const Protected = withProtected(DummyPage);
    expect(Protected.displayName).toBe('withProtected(DummyPage)');
  });

  it('should render loading overlay when auth is loading', async () => {
    mockIsLoading = true;
    mockUser = undefined;
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    screen.getByTestId('loading');
    expect(screen.queryByTestId('dummy-page')).toBeNull();
  });

  it('should render loading overlay when user is undefined', async () => {
    mockIsLoading = false;
    mockUser = undefined;
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    screen.getByTestId('loading');
  });

  it('should persist redirect and navigate to login when user is undefined', async () => {
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

  it('should not persist redirect when pathname is login', async () => {
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

  it('should render component when user is authenticated', async () => {
    mockIsLoading = false;
    mockUser = makeUser();
    const Protected = withProtected(DummyPage);
    await act(async () => render(<Protected />));
    screen.getByTestId('dummy-page');
  });

  it('should redirect to no-role when user has no roles', async () => {
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

  it('should redirect to unauthorized when user lacks required role', async () => {
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

  it('should render component when user has matching role', async () => {
    mockIsLoading = false;
    mockUser = makeUser({ roles: [{ role: Role.VIEWER, clients: ['100'] }] });
    const Protected = withProtected(DummyPage, [{ role: Role.VIEWER, clients: [] }]);
    await act(async () => render(<Protected />));
    screen.getByTestId('dummy-page');
  });

  it('should render component when roles array is empty', async () => {
    mockIsLoading = false;
    mockUser = makeUser({ roles: [{ role: Role.VIEWER, clients: ['100'] }] });
    const Protected = withProtected(DummyPage, []);
    await act(async () => render(<Protected />));
    screen.getByTestId('dummy-page');
  });

  it('should use component name for display name when display name is missing', () => {
    function NamedComp() {
      return null;
    }
    const Protected = withProtected(NamedComp);
    expect(Protected.displayName).toBe('withProtected(NamedComp)');
  });

  it('should use fallback name for display name when both missing', () => {
    const anon = (() => null) as React.ComponentType;
    const Protected = withProtected(anon);
    expect(Protected.displayName).toContain('withProtected(');
  });

  it('should redirect to role error when user has role error status', async () => {
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
