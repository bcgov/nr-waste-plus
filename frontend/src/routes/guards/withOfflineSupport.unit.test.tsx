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

  it('should set display name when wrapping', () => {
    const Wrapped = withOfflineSupport(TargetPage);
    expect(Wrapped.displayName).toBe('withOfflineSupport(TargetPage)');
  });

  describe('no options (offlineReady default)', () => {
    it('should render component when online', async () => {
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage);
      render(<Wrapped />);
      screen.getByTestId('target-page');
    });

    it('should render component when offline', async () => {
      mockIsOnline = false;
      const Wrapped = withOfflineSupport(TargetPage);
      render(<Wrapped />);
      screen.getByTestId('target-page');
    });

    it('should not navigate when online', async () => {
      const { navigateInTree } = await import('@/routes/inTreePaths');
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage);
      render(<Wrapped />);
      expect(vi.mocked(navigateInTree)).not.toHaveBeenCalled();
    });
  });

  describe('offlineReady: true', () => {
    it('should render component when online', async () => {
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage, { offlineReady: true });
      render(<Wrapped />);
      screen.getByTestId('target-page');
    });

    it('should render component when offline', async () => {
      mockIsOnline = false;
      const Wrapped = withOfflineSupport(TargetPage, { offlineReady: true });
      render(<Wrapped />);
      screen.getByTestId('target-page');
    });
  });

  describe('offlineOnly: true', () => {
    it('should render null when online', async () => {
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage, { offlineOnly: true });
      const { container } = render(<Wrapped />);
      expect(screen.queryByTestId('target-page')).toBeNull();
      expect(container.firstChild).toBeNull();
    });

    it('should render component when offline', async () => {
      mockIsOnline = false;
      const Wrapped = withOfflineSupport(TargetPage, { offlineOnly: true });
      render(<Wrapped />);
      screen.getByTestId('target-page');
    });

    it('should navigate to search when online', async () => {
      const { navigateInTree } = await import('@/routes/inTreePaths');
      mockIsOnline = true;
      const Wrapped = withOfflineSupport(TargetPage, { offlineOnly: true });
      render(<Wrapped />);
      expect(vi.mocked(navigateInTree)).toHaveBeenCalledWith(
        mockNavigate,
        '/search',
        expect.objectContaining({ replace: true }),
      );
    });

    it('should not navigate when offline', async () => {
      const { navigateInTree } = await import('@/routes/inTreePaths');
      mockIsOnline = false;
      const Wrapped = withOfflineSupport(TargetPage, { offlineOnly: true });
      render(<Wrapped />);
      expect(vi.mocked(navigateInTree)).not.toHaveBeenCalled();
    });
  });
});
