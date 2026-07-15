import { render, screen } from '@testing-library/react';
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

  it('should set display name when wrapping', () => {
    const Wrapped = withPublicOnly(PublicPage);
    expect(Wrapped.displayName).toBe('withPublicOnly(PublicPage)');
  });

  it('should render component when user is not logged in', async () => {
    mockIsLoggedIn = false;
    mockIsLoading = false;
    const Wrapped = withPublicOnly(PublicPage);
    render(<Wrapped />);
    screen.getByTestId('public-page');
  });

  it('should render null when auth is loading', async () => {
    mockIsLoggedIn = false;
    mockIsLoading = true;
    const Wrapped = withPublicOnly(PublicPage);
    render(<Wrapped />);
    expect(screen.queryByTestId('public-page')).toBeNull();
  });

  it('should render null when user is logged in', async () => {
    mockIsLoggedIn = true;
    mockIsLoading = false;
    const Wrapped = withPublicOnly(PublicPage);
    render(<Wrapped />);
    expect(screen.queryByTestId('public-page')).toBeNull();
  });

  it('should navigate to dashboard when user is logged in', async () => {
    const { navigateInTree } = await import('@/routes/inTreePaths');
    mockIsLoggedIn = true;
    mockIsLoading = false;
    const Wrapped = withPublicOnly(PublicPage);
    render(<Wrapped />);
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
      mockNavigate,
      '/dashboard',
      expect.objectContaining({ replace: true }),
    );
  });

  it('should not navigate when auth is loading', async () => {
    const { navigateInTree } = await import('@/routes/inTreePaths');
    mockIsLoggedIn = false;
    mockIsLoading = true;
    const Wrapped = withPublicOnly(PublicPage);
    render(<Wrapped />);
    expect(vi.mocked(navigateInTree)).not.toHaveBeenCalled();
  });

  it('should not navigate when user is not logged in', async () => {
    const { navigateInTree } = await import('@/routes/inTreePaths');
    mockIsLoggedIn = false;
    mockIsLoading = false;
    const Wrapped = withPublicOnly(PublicPage);
    render(<Wrapped />);
    expect(vi.mocked(navigateInTree)).not.toHaveBeenCalled();
  });
});
