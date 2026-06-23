import { describe, it, expect, vi } from 'vitest';

import { navigateInTree, type InTreePath } from './inTreePaths';

describe('inTreePaths', () => {
  describe('navigateInTree', () => {
    it('shouldCallNavigate_withToPath', () => {
      const navigate = vi.fn();
      navigateInTree(navigate, '/search');
      expect(navigate).toHaveBeenCalledWith({ to: '/search' });
    });

    it('shouldPassReplaceOption', () => {
      const navigate = vi.fn();
      navigateInTree(navigate, '/dashboard', { replace: true });
      expect(navigate).toHaveBeenCalledWith({ to: '/dashboard', replace: true });
    });

    it('shouldPassSearchParams', () => {
      const navigate = vi.fn();
      navigateInTree(navigate, '/search', { replace: false, search: { q: 'test' } });
      expect(navigate).toHaveBeenCalledWith({
        to: '/search',
        replace: false,
        search: { q: 'test' },
      });
    });

    it('shouldAcceptAllInTreePaths', () => {
      const paths: InTreePath[] = [
        '/',
        '/dashboard',
        '/search',
        '/clients',
        '/no-role',
        '/unauthorized',
        '/configuration/district-volume-tables/123',
      ];
      paths.forEach((path) => {
        const navigate = vi.fn();
        navigateInTree(navigate, path);
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: path }));
      });
    });

    it('shouldNotPassUndefinedOpts_whenOptsOmitted', () => {
      const navigate = vi.fn();
      navigateInTree(navigate, '/no-role');
      const call = navigate.mock.calls[0][0];
      // Only `to` key expected — no replace, no search
      expect(call).toEqual({ to: '/no-role' });
    });
  });
});
