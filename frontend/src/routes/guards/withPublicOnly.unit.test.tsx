import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { withPublicOnly } from './withPublicOnly';

// ── Mutable state ─────────────────────────────────────────────────────────────
let mockIsLoggedIn = false;
let mockIsLoading = false;
const mockNavigate = vi.fn();

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ isLoggedIn: mockIsLoggedIn, isLoading: mockIsLoading }),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function PublicPage() {
  return <div data-testid="public-page">Landing</div>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('withPublicOnly', () => {
  beforeEach(() => {
    mockIsLoggedIn = false;
    mockIsLoading = false;
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it('shouldSetDisplayName_whenWrapping', () => {
    const Wrapped = withPublicOnly(PublicPage);
    expect(Wrapped.displayName).toBe('withPublicOnly(PublicPage)');
  });

  it('shouldRenderComponent_whenUserIsNotLoggedIn', async () => {
    mockIsLoggedIn = false;
    mockIsLoading = false;
    const Wrapped = withPublicOnly(PublicPage);
    await act(async () => render(<Wrapped />));
    screen.getByTestId('public-page');
  });

  it('shouldRenderNull_whenAuthIsLoading', async () => {
    mockIsLoggedIn = false;
    mockIsLoading = true;
    const Wrapped = withPublicOnly(PublicPage);
    const { container } = await act(async () => render(<Wrapped />));
    expect(screen.queryByTestId('public-page')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('shouldRenderNull_whenUserIsLoggedIn', async () => {
    mockIsLoggedIn = true;
    mockIsLoading = false;
    const Wrapped = withPublicOnly(PublicPage);
    const { container } = await act(async () => render(<Wrapped />));
    expect(screen.queryByTestId('public-page')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('shouldNavigateToDashboard_whenUserIsLoggedIn', async () => {
    const { navigateInTree } = await import('@/routes/inTreePaths');
    mockIsLoggedIn = true;
    mockIsLoading = false;
    const Wrapped = withPublicOnly(PublicPage);
    await act(async () => render(<Wrapped />));
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
      mockNavigate,
      '/dashboard',
      expect.objectContaining({ replace: true }),
    );
  });

  it('shouldNotNavigate_whenAuthIsLoading', async () => {
    const { navigateInTree } = await import('@/routes/inTreePaths');
    mockIsLoggedIn = false;
    mockIsLoading = true;
    const Wrapped = withPublicOnly(PublicPage);
    await act(async () => render(<Wrapped />));
    expect(vi.mocked(navigateInTree)).not.toHaveBeenCalled();
  });

  it('shouldNotNavigate_whenUserIsNotLoggedIn', async () => {
    const { navigateInTree } = await import('@/routes/inTreePaths');
    mockIsLoggedIn = false;
    mockIsLoading = false;
    const Wrapped = withPublicOnly(PublicPage);
    await act(async () => render(<Wrapped />));
    expect(vi.mocked(navigateInTree)).not.toHaveBeenCalled();
  });
});
