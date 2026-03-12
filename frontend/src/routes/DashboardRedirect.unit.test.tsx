import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardRedirect from './DashboardRedirect';

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}));

describe('DashboardRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    globalThis.history.pushState({}, '', '/dashboard');
    mockUseLocation.mockReturnValue({ pathname: '/dashboard', search: '' });
  });

  it('navigates to a valid persisted relative app path', () => {
    sessionStorage.setItem('redirectAfterLogin', '/search?district=DFN');

    render(<DashboardRedirect />);

    expect(mockNavigate).toHaveBeenCalledWith('/search?district=DFN', { replace: true });
  });

  it('ignores an invalid absolute redirect target from storage', () => {
    sessionStorage.setItem('redirectAfterLogin', 'https://evil.example/phish');

    render(<DashboardRedirect />);

    expect(mockNavigate).toHaveBeenCalledWith('/search', { replace: true });
    expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
  });

  it('ignores /dashboard as persisted redirect target and falls through to /search redirect', () => {
    sessionStorage.setItem('redirectAfterLogin', '/dashboard?district=DFN');
    mockUseLocation.mockReturnValue({ pathname: '/dashboard', search: '?district=DFN' });

    render(<DashboardRedirect />);

    expect(mockNavigate).toHaveBeenCalledWith('/search?district=DFN', { replace: true });
    expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
  });

  it('redirects OAuth callback query to /search', () => {
    mockUseLocation.mockReturnValue({ pathname: '/dashboard', search: '?code=123&state=456' });

    render(<DashboardRedirect />);

    expect(mockNavigate).toHaveBeenCalledWith('/search', { replace: true });
  });
});
