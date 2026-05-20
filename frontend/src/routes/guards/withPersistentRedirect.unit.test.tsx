import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { withPersistentRedirect } from './withPersistentRedirect';

// ── Mutable state ─────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
let mockSearchStr = '';
let mockIsLoading = false;

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ isLoading: mockIsLoading }),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useRouterState: ({ select }: { select: (s: { location: { searchStr: string } }) => unknown }) =>
      select({ location: { searchStr: mockSearchStr } }),
  };
});

vi.mock('@/routes/redirectStorage', () => ({
  readPersistedRedirect: vi.fn(),
  clearPersistedRedirect: vi.fn(),
}));

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function DummyPage() {
  return <div data-testid="dummy-page">Dashboard</div>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('withPersistentRedirect', () => {
  beforeEach(() => {
    mockSearchStr = '';
    mockIsLoading = false;
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it('shouldSetDisplayName_whenWrapping', () => {
    const Wrapped = withPersistentRedirect(DummyPage);
    expect(Wrapped.displayName).toBe('withPersistentRedirect(DummyPage)');
  });

  it('shouldRenderComponent', async () => {
    const { readPersistedRedirect } = await import('@/routes/redirectStorage');
    vi.mocked(readPersistedRedirect).mockReturnValue(null);
    const Wrapped = withPersistentRedirect(DummyPage);
    await act(async () => render(<Wrapped />));
    expect(screen.getByTestId('dummy-page')).toBeDefined();
  });

  it('shouldNavigateToPersistedTarget_whenValidPathExists', async () => {
    const { readPersistedRedirect, clearPersistedRedirect } =
      await import('@/routes/redirectStorage');
    const { navigateInTree } = await import('@/routes/inTreePaths');
    vi.mocked(readPersistedRedirect).mockReturnValue('/search?q=abc');
    const Wrapped = withPersistentRedirect(DummyPage);
    await act(async () => render(<Wrapped />));
    expect(vi.mocked(clearPersistedRedirect)).toHaveBeenCalled();
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
      mockNavigate,
      '/search?q=abc',
      expect.objectContaining({ replace: true }),
    );
  });

  it('shouldClearRedirectAndNavigateToSearch_whenOAuthCallback', async () => {
    const { readPersistedRedirect, clearPersistedRedirect } =
      await import('@/routes/redirectStorage');
    const { navigateInTree } = await import('@/routes/inTreePaths');
    vi.mocked(readPersistedRedirect).mockReturnValue(null);
    mockSearchStr = '?code=authcode123&state=statevalue';
    const Wrapped = withPersistentRedirect(DummyPage);
    await act(async () => render(<Wrapped />));
    expect(vi.mocked(clearPersistedRedirect)).toHaveBeenCalled();
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
      mockNavigate,
      '/search',
      expect.objectContaining({ replace: true }),
    );
  });

  it('shouldNavigateToSearch_withPassthroughParams_whenNoPersistedAndNoOAuth', async () => {
    const { readPersistedRedirect } = await import('@/routes/redirectStorage');
    const { navigateInTree } = await import('@/routes/inTreePaths');
    vi.mocked(readPersistedRedirect).mockReturnValue(null);
    mockSearchStr = '?ref=email';
    const Wrapped = withPersistentRedirect(DummyPage);
    await act(async () => render(<Wrapped />));
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
      mockNavigate,
      '/search',
      expect.objectContaining({ replace: true, search: { ref: 'email' } }),
    );
  });

  it('shouldIgnoreUnsafePersistTarget_startingWithDoubleSlash', async () => {
    const { readPersistedRedirect } = await import('@/routes/redirectStorage');
    const { navigateInTree } = await import('@/routes/inTreePaths');
    vi.mocked(readPersistedRedirect).mockReturnValue('//evil.com/path');
    mockSearchStr = '';
    const Wrapped = withPersistentRedirect(DummyPage);
    await act(async () => render(<Wrapped />));
    // Should fall through to fallback (/search), not navigate to //evil.com
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
      mockNavigate,
      '/search',
      expect.objectContaining({ replace: true }),
    );
  });

  it('shouldIgnoreDashboardTarget_toPreventRedirectLoop', async () => {
    const { readPersistedRedirect } = await import('@/routes/redirectStorage');
    const { navigateInTree } = await import('@/routes/inTreePaths');
    vi.mocked(readPersistedRedirect).mockReturnValue('/dashboard');
    mockSearchStr = '';
    const Wrapped = withPersistentRedirect(DummyPage);
    await act(async () => render(<Wrapped />));
    // /dashboard must be suppressed; should fall to fallback
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
      mockNavigate,
      '/search',
      expect.objectContaining({ replace: true }),
    );
  });

  it('shouldNotNavigate_whenAuthIsLoading', async () => {
    const { readPersistedRedirect } = await import('@/routes/redirectStorage');
    const { navigateInTree } = await import('@/routes/inTreePaths');
    vi.mocked(readPersistedRedirect).mockReturnValue('/search');
    mockIsLoading = true;
    const Wrapped = withPersistentRedirect(DummyPage);
    await act(async () => render(<Wrapped />));
    expect(vi.mocked(navigateInTree)).not.toHaveBeenCalled();
  });

  it('shouldNavigateOnlyOnce_whenRerenderedMultipleTimes', async () => {
    const { readPersistedRedirect } = await import('@/routes/redirectStorage');
    const { navigateInTree } = await import('@/routes/inTreePaths');
    vi.mocked(readPersistedRedirect).mockReturnValue(null);
    const Wrapped = withPersistentRedirect(DummyPage);
    const { rerender } = await act(async () => render(<Wrapped />));
    await act(async () => rerender(<Wrapped />));
    expect(vi.mocked(navigateInTree)).toHaveBeenCalledTimes(1);
  });
});
