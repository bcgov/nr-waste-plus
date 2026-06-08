import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { withOfflineSupport } from './withOfflineSupport';

// ── Mutable state ─────────────────────────────────────────────────────────────
let mockIsOnline = true;
const mockNavigate = vi.fn();

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('@/hooks/useOfflineMode', () => ({
  default: () => ({ isOnline: mockIsOnline }),
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
function TargetPage() {
  return <div data-testid="target-page">Target</div>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('withOfflineSupport', () => {
  beforeEach(() => {
    mockIsOnline = true;
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it('shouldSetDisplayName_whenWrapping', () => {
    const Wrapped = withOfflineSupport(TargetPage);
    expect(Wrapped.displayName).toBe('withOfflineSupport(TargetPage)');
  });

  describe('no options (offlineReady default)', () => {
    it('shouldRenderComponent_whenOnline', async () => {
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage);
      await act(async () => render(<Wrapped />));
      screen.getByTestId('target-page');
    });

    it('shouldRenderComponent_whenOffline', async () => {
      mockIsOnline = false;
      const Wrapped = withOfflineSupport(TargetPage);
      await act(async () => render(<Wrapped />));
      screen.getByTestId('target-page');
    });

    it('shouldNotNavigate_whenOnline', async () => {
      const { navigateInTree } = await import('@/routes/inTreePaths');
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage);
      await act(async () => render(<Wrapped />));
      expect(vi.mocked(navigateInTree)).not.toHaveBeenCalled();
    });
  });

  describe('offlineReady: true', () => {
    it('shouldRenderComponent_whenOnline', async () => {
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage, { offlineReady: true });
      await act(async () => render(<Wrapped />));
      screen.getByTestId('target-page');
    });

    it('shouldRenderComponent_whenOffline', async () => {
      mockIsOnline = false;
      const Wrapped = withOfflineSupport(TargetPage, { offlineReady: true });
      await act(async () => render(<Wrapped />));
      screen.getByTestId('target-page');
    });
  });

  describe('offlineOnly: true', () => {
    it('shouldRenderNull_whenOnline', async () => {
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage, { offlineOnly: true });
      const { container } = await act(async () => render(<Wrapped />));
      expect(screen.queryByTestId('target-page')).toBeNull();
      expect(container.firstChild).toBeNull();
    });

    it('shouldRenderComponent_whenOffline', async () => {
      mockIsOnline = false;
      const Wrapped = withOfflineSupport(TargetPage, { offlineOnly: true });
      await act(async () => render(<Wrapped />));
      screen.getByTestId('target-page');
    });

    it('shouldNavigateToSearch_whenOnline', async () => {
      const { navigateInTree } = await import('@/routes/inTreePaths');
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage, { offlineOnly: true });
      await act(async () => render(<Wrapped />));
      expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
        mockNavigate,
        '/search',
        expect.objectContaining({ replace: true }),
      );
    });

    it('shouldNotNavigate_whenOffline', async () => {
      const { navigateInTree } = await import('@/routes/inTreePaths');
      mockIsOnline = false;
      const Wrapped = withOfflineSupport(TargetPage, { offlineOnly: true });
      await act(async () => render(<Wrapped />));
      expect(vi.mocked(navigateInTree)).not.toHaveBeenCalled();
    });
  });
});
