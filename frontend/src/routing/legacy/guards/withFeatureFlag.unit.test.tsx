import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { withFeatureFlag } from './withFeatureFlag';

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('@tanstack/react-router', async () => {
  return {
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
      const Guarded = withFeatureFlag(DummyPage, 'reporting-unit-create-enabled');
      expect(Guarded.displayName).toBe('withFeatureFlag(DummyPage)');
    });

    it('should use component name for display name when displayName is missing', () => {
      const Guarded = withFeatureFlag(NamedPage, 'reporting-unit-create-enabled');
      expect(Guarded.displayName).toBe('withFeatureFlag(NamedPage)');
    });

    it('should use fallback name for display name when both are missing', () => {
      const anon = (() => null) as React.ComponentType;
      const Guarded = withFeatureFlag(anon, 'reporting-unit-create-enabled');
      expect(Guarded.displayName).toContain('withFeatureFlag(');
    });
  });

  describe('when flag is enabled', () => {
    it('should render the wrapped component', () => {
      const Guarded = withFeatureFlag(DummyPage, 'reporting-unit-create-enabled');
      render(<Guarded />);
      screen.getByTestId('dummy-page');
    });

    it('should pass props to the wrapped component', () => {
      const Guarded = withFeatureFlag(PropsPage, 'reporting-unit-create-enabled');
      render(<Guarded label="hello" />);
      expect(screen.getByTestId('props-page').textContent).toBe('hello');
    });

    it('should not throw an error', () => {
      const Guarded = withFeatureFlag(DummyPage, 'reporting-unit-create-enabled');
      expect(() => render(<Guarded />)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined flag name (no gating)', () => {
      const Guarded = withFeatureFlag(DummyPage, undefined);
      render(<Guarded />);
      screen.getByTestId('dummy-page');
    });

    it('should throw notFound error when flag is not set in featureFlags', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Guarded = withFeatureFlag(DummyPage, 'nonexistent-flag' as any);
      expect(() => render(<Guarded />)).toThrow('NOT_FOUND');
    });
  });
});
