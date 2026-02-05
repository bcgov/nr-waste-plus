import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import RoleBasedRedirectLinkTag from './index';

import { Role } from '@/context/auth/types';
import * as useAuthModule from '@/context/auth/useAuth';

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('RoleBasedRedirectLinkTag', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders RedirectLinkTag when user has allowed role (ADMIN)', () => {
    const userRoles: Role[] = [Role.ADMIN, Role.VIEWER];

    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: userRoles.map((role) => ({ role })) },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];

    render(
      <RoleBasedRedirectLinkTag
        text="Click here"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    const linkTag = screen.getByRole('link', { name: 'Click here' });
    expect(linkTag).toBeTruthy();
    expect(linkTag).toHaveProperty('href', 'https://example.com/');
  });

  it('renders RedirectLinkTag when user has one of multiple allowed roles (VIEWER)', () => {
    const userRoles: Role[] = [Role.VIEWER, Role.SUBMITTER];

    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: userRoles.map((role) => ({ role })) },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN, Role.VIEWER];

    render(
      <RoleBasedRedirectLinkTag
        text="View Details"
        url="https://viewer.example.com"
        allowedRoles={allowedRoles}
      />,
    );

    const linkTag = screen.getByRole('link', { name: 'View Details' });
    expect(linkTag).toBeTruthy();
  });

  it('renders plain text when user does NOT have allowed role', () => {
    const userRoles: Role[] = [Role.VIEWER, Role.SUBMITTER];
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: userRoles.map((role) => ({ role })) },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN, Role.DISTRICT];

    const { container } = render(
      <RoleBasedRedirectLinkTag
        text="Restricted Link"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    expect(screen.queryByTestId('redirect-link-tag')).toBeFalsy();
    expect(screen.getByText('Restricted Link')).toBeTruthy();
    expect(container.querySelector('a')).toBeFalsy();
  });

  it('renders plain text when user has no roles', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: undefined },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];

    render(
      <RoleBasedRedirectLinkTag
        text="No Role Link"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    expect(screen.queryByTestId('redirect-link-tag')).toBeFalsy();
    expect(screen.getByText('No Role Link')).toBeTruthy();
  });

  it('renders plain text when user is undefined', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: undefined,
      isLoggedIn: false,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];

    render(
      <RoleBasedRedirectLinkTag
        text="No User Link"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    expect(screen.queryByTestId('redirect-link-tag')).toBeFalsy();
    expect(screen.getByText('No User Link')).toBeTruthy();
  });

  it('passes sameTab prop correctly to RedirectLinkTag', () => {
    const userRoles: Role[] = [Role.ADMIN];

    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: userRoles.map((role) => ({ role })) },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];
    render(
      <RoleBasedRedirectLinkTag
        text="Same Tab Link"
        url="https://example.com"
        allowedRoles={allowedRoles}
        sameTab={true}
      />,
    );

    const linkTag = screen.getByRole('link', { name: 'Same Tab Link' });
    expect(linkTag).toHaveProperty('target', '_self');
  });

  it('defaults sameTab to false (new tab)', () => {
    const userRoles: Role[] = [Role.ADMIN];

    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: userRoles.map((role) => ({ role })) },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];
    render(
      <RoleBasedRedirectLinkTag
        text="Default Tab Link"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    const linkTag = screen.getByRole('link', { name: 'Default Tab Link' });
    expect(linkTag).toHaveProperty('target', '_blank');
  });

  describe('onRenderStateChange callback', () => {
    it('calls onRenderStateChange with true when user has allowed role', () => {
      const mockCallback = vi.fn();
      const userRoles: Role[] = [Role.ADMIN];

      (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { roles: userRoles.map((role) => ({ role })) },
        isLoggedIn: true,
        isLoading: false,
      });

      const allowedRoles: Role[] = [Role.ADMIN];

      render(
        <RoleBasedRedirectLinkTag
          text="Allowed Link"
          url="https://example.com"
          allowedRoles={allowedRoles}
          onRenderStateChange={mockCallback}
        />,
      );

      expect(mockCallback).toHaveBeenCalledWith(true);
    });

    it('calls onRenderStateChange with false when user does NOT have allowed role', () => {
      const mockCallback = vi.fn();
      const userRoles: Role[] = [Role.VIEWER];

      (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { roles: userRoles.map((role) => ({ role })) },
        isLoggedIn: true,
        isLoading: false,
      });

      const allowedRoles: Role[] = [Role.ADMIN];

      render(
        <RoleBasedRedirectLinkTag
          text="Restricted Link"
          url="https://example.com"
          allowedRoles={allowedRoles}
          onRenderStateChange={mockCallback}
        />,
      );

      expect(mockCallback).toHaveBeenCalledWith(false);
    });

    it('calls onRenderStateChange with false when user is undefined', () => {
      const mockCallback = vi.fn();

      (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: undefined,
        isLoggedIn: false,
        isLoading: false,
      });

      const allowedRoles: Role[] = [Role.ADMIN];

      render(
        <RoleBasedRedirectLinkTag
          text="No User Link"
          url="https://example.com"
          allowedRoles={allowedRoles}
          onRenderStateChange={mockCallback}
        />,
      );

      expect(mockCallback).toHaveBeenCalledWith(false);
    });

    it('does not require onRenderStateChange callback (optional prop)', () => {
      const userRoles: Role[] = [Role.ADMIN];

      (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { roles: userRoles.map((role) => ({ role })) },
        isLoggedIn: true,
        isLoading: false,
      });

      const allowedRoles: Role[] = [Role.ADMIN];

      expect(() => {
        render(
          <RoleBasedRedirectLinkTag
            text="Link Without Callback"
            url="https://example.com"
            allowedRoles={allowedRoles}
          />,
        );
      }).not.toThrow();
    });
  });
});
