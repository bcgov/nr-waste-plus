import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import RouterHost from './routerHost';

// The legacy host is a thin component — mock it so the test observes which
// implementation the build-time switch selects without mounting the legacy
// router itself.
vi.mock('@/routing/legacy/AppRouter', () => ({
  default: () => <div data-testid="legacy-router-host" />,
}));

describe('RouterHost (T-18)', () => {
  it('mounts exactly one router implementation matching VITE_ROUTER_IMPL', () => {
    render(<RouterHost />);

    if (import.meta.env.VITE_ROUTER_IMPL === 'next') {
      // In next mode the file-based RouterProvider mounts instead of the
      // legacy host (the next branch itself is exercised by the routing
      // suites; here we only verify the legacy branch did not mount).
      expect(screen.queryByTestId('legacy-router-host')).toBeNull();
    } else {
      // Default (unset/unknown) resolves to legacy — DEC-013.
      expect(screen.getByTestId('legacy-router-host')).toBeTruthy();
    }
  });
});
