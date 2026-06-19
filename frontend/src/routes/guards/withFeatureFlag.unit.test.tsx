import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { withFeatureFlag } from './withFeatureFlag';

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    notFound: () => new Error('NOT_FOUND'),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function DummyPage() {
  return <div data-testid="dummy-page">Content</div>;
}

function NamedPage() {
  return <div data-testid="named-page">Named Content</div>;
}

function PropsPage({ label }: { label: string }) {
  return <div data-testid="props-page">{label}</div>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('withFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('display name', () => {
    it('should set display name when wrapping a named component', () => {
      const Guarded = withFeatureFlag(DummyPage, true);
      expect(Guarded.displayName).toBe('withFeatureFlag(DummyPage)');
    });

    it('should use component name for display name when displayName is missing', () => {
      const Guarded = withFeatureFlag(NamedPage, true);
      expect(Guarded.displayName).toBe('withFeatureFlag(NamedPage)');
    });

    it('should use fallback name for display name when both are missing', () => {
      const anon = (() => null) as React.ComponentType;
      const Guarded = withFeatureFlag(anon, true);
      expect(Guarded.displayName).toContain('withFeatureFlag(');
    });
  });

  describe('when flag is enabled', () => {
    it('should render the wrapped component', () => {
      const Guarded = withFeatureFlag(DummyPage, true);
      render(<Guarded />);
      screen.getByTestId('dummy-page');
    });

    it('should pass props to the wrapped component', () => {
      const Guarded = withFeatureFlag(PropsPage, true);
      render(<Guarded label="hello" />);
      expect(screen.getByTestId('props-page').textContent).toBe('hello');
    });

    it('should not throw an error', () => {
      const Guarded = withFeatureFlag(DummyPage, true);
      expect(() => render(<Guarded />)).not.toThrow();
    });
  });

  describe('when flag is disabled', () => {
    it('should throw notFound error', () => {
      const Guarded = withFeatureFlag(DummyPage, false);
      expect(() => render(<Guarded />)).toThrow('NOT_FOUND');
    });

    it('should not render the wrapped component', () => {
      const Guarded = withFeatureFlag(DummyPage, false);
      try {
        render(<Guarded />);
      } catch {
        // Expected
      }
      expect(screen.queryByTestId('dummy-page')).toBeNull();
    });

    it('should not render any content when disabled', () => {
      const Guarded = withFeatureFlag(DummyPage, false);
      try {
        render(<Guarded />);
      } catch {
        // Expected - notFound throws
      }
      // Component should not have rendered any content
      expect(screen.queryByTestId('dummy-page')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined isEnabled the same as false', () => {
      const Guarded = withFeatureFlag(DummyPage, undefined);
      expect(() => render(<Guarded />)).toThrow('NOT_FOUND');
    });
  });
});
