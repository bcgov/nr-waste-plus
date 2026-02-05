/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import TooltipRoleBasedRedirectLinkTag from './index';

import { Role } from '@/context/auth/types';
import * as useAuthModule from '@/context/auth/useAuth';

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('TooltipRoleBasedRedirectLinkTag', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders tooltip wrapper when user has allowed role', async () => {
    const userRoles: Role[] = [Role.ADMIN];

    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: userRoles.map((role) => ({ role })) },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];

    render(
      <TooltipRoleBasedRedirectLinkTag
        tooltip="This is a helpful tooltip"
        text="Click here"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    const linkTag = screen.getByRole('link', { name: 'Click here' });
    expect(linkTag).toBeTruthy();

    // Check that tooltip is in the DOM (as part of DefinitionTooltip)
    // The tooltip text should be accessible in the accessibility tree
    const tooltipElement = screen.getByText('This is a helpful tooltip');
    expect(tooltipElement).toBeTruthy();
  });

  it('does NOT render tooltip wrapper when user does NOT have allowed role', async () => {
    const userRoles: Role[] = [Role.VIEWER];

    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: userRoles.map((role) => ({ role })) },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];

    const { container } = render(
      <TooltipRoleBasedRedirectLinkTag
        tooltip="This is a helpful tooltip"
        text="Restricted Link"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    // Should render span, not link
    const restrictedSpan = screen.queryByRole('link', { name: 'Restricted Link' });
    expect(restrictedSpan).toBeFalsy();

    // Should NOT have tooltip wrapper (DefinitionTooltip)
    const tooltipWrapper = container.querySelector('[role="tooltip"]');
    expect(tooltipWrapper).toBeFalsy();
  });

  it('displays restricted text without tooltip when user lacks permission', () => {
    const userRoles: Role[] = [Role.SUBMITTER];

    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: userRoles },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];

    render(
      <TooltipRoleBasedRedirectLinkTag
        tooltip="Restricted content"
        text="You don't have access"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    const text = screen.getByText("You don't have access");
    expect(text.tagName).toBe('SPAN');
  });

  it('passes through all props to RoleBasedRedirectLinkTag', () => {
    const userRoles: Role[] = [Role.ADMIN];

    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: userRoles.map((role) => ({ role })) },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];

    render(
      <TooltipRoleBasedRedirectLinkTag
        tooltip="Tooltip text"
        text="Link text"
        url="https://specific-url.com"
        allowedRoles={allowedRoles}
        sameTab={true}
      />,
    );

    const linkTag = screen.getByRole('link', { name: 'Link text' });
    expect(linkTag).toHaveProperty('href', 'https://specific-url.com/');
    expect(linkTag).toHaveProperty('target', '_self');
  });

  it('renders correctly when user has no roles', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { roles: [] },
      isLoggedIn: true,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];

    render(
      <TooltipRoleBasedRedirectLinkTag
        tooltip="No roles"
        text="Restricted"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    const restrictedSpan = screen.queryByRole('link', { name: 'Restricted' });
    expect(restrictedSpan).toBeFalsy();

    //check if there is a span with Restricted in it
    expect(screen.getByText('Restricted').tagName).toBe('SPAN');
  });

  it('renders correctly when user is undefined', () => {
    (useAuthModule.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: undefined,
      isLoggedIn: false,
      isLoading: false,
    });

    const allowedRoles: Role[] = [Role.ADMIN];

    render(
      <TooltipRoleBasedRedirectLinkTag
        tooltip="No user"
        text="Restricted"
        url="https://example.com"
        allowedRoles={allowedRoles}
      />,
    );

    const restrictedSpan = screen.queryByRole('link', { name: 'Restricted' });
    expect(restrictedSpan).toBeFalsy();

    //check if there is a span with Restricted in it
    expect(screen.getByText('Restricted').tagName).toBe('SPAN');
  });
});
