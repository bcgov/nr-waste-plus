import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import { Role, type FamLoginUser } from '@/context/auth/types';
import APIs from '@/services/APIs';

import HeaderPanelProfile from './index';

vi.mock('@/components/Layout/AvatarImage', () => ({
  __esModule: true,
  default: ({ userName, size }: { userName: string; size: string }) => (
    <div data-testid="avatar-initials">
      {userName}-{size}
    </div>
  ),
}));

const mockToggleTheme = vi.fn();
const mockLogout = vi.fn();
const mockClients = vi.fn().mockReturnValue(['client1', 'client2']);
let mockUser: FamLoginUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  idpProvider: 'IDIR',
  userName: 'jdoe',
  email: 'jane@example.com',
  roles: [{ role: Role.ADMIN, clients: ['client1', 'client2'] }],
} as FamLoginUser;

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout, user: mockUser, getClients: mockClients }),
}));
vi.mock('@/context/theme/useTheme', () => ({
  useTheme: () => ({ theme: 'g100', toggleTheme: mockToggleTheme }),
}));
vi.mock('@/services/APIs', () => {
  return {
    default: {
      user: {
        getUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
      },
    },
  };
});

const renderWithProviders = () => renderWithAppAsync(<HeaderPanelProfile />);

describe('HeaderPanelProfile', () => {
  beforeEach(() => {
    mockUser = {
      firstName: 'Jane',
      lastName: 'Doe',
      idpProvider: 'IDIR',
      userName: 'jdoe',
      email: 'jane@example.com',
      roles: [{ role: Role.ADMIN, clients: ['client1', 'client2'] }],
    } as FamLoginUser;
    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
  });

  it('renders user info and avatar', async () => {
    await renderWithProviders();
    screen.getByText('Jane Doe');
    screen.getByText('IDIR\\jdoe');
    screen.getByText('Email: jane@example.com');
    expect(screen.getByTestId('avatar-initials').textContent).toBe('Jane Doe-large');
    expect(screen.getByTestId('user-fullname').textContent).toBe('Jane Doe');
  });

  it('renders gracefully when user lacks roles or idp provider', async () => {
    mockUser = {
      firstName: 'No',
      lastName: 'Roles',
      userName: 'nroles',
      email: 'no@example.com',
    } as FamLoginUser;
    await renderWithProviders();
    screen.getByText('No Roles');
    screen.getByText('nroles');
    screen.getByText('Role:');
    screen.getByText('Email: no@example.com');
    // Without client roles the panel falls back to district selection.
    screen.getByText('Select organization');
  });

  it('calls logout when Log out is clicked', async () => {
    const user = userEvent.setup();
    await renderWithProviders();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('renders tooltip with correct text and Help icon', async () => {
    await renderWithProviders();
    const tooltipLabel =
      'Optional: Select a default organization. This can help you do your searches faster if you work with one organization much more than others. You can change or remove this at any time.';
    screen.getByText('Select organization');
    screen.getByLabelText('Help: About selecting a default organization');
    screen.getByText(tooltipLabel);
  });

  it('renders DistrictListing for user with District/Area/Admin role', async () => {
    await renderWithProviders();
    screen.getByText('Select organization');
  });

  it('renders correct entity type text based on user role', async () => {
    await renderWithProviders();
    screen.getByText('Select organization');
  });

  it('renders navigation structure and SideNavDivider', async () => {
    await renderWithProviders();
    screen.getByRole('navigation');
    expect(screen.getAllByRole('separator').length).toBeGreaterThan(0);
  });

  it('Log out is a focusable, keyboard-activatable button (#1389)', async () => {
    const user = userEvent.setup();
    mockLogout.mockClear();
    await renderWithProviders();

    // Resolvable by role, rendered as a real <button>, removed from the DOM
    // default tab order only in the sense that it participates naturally.
    const logoutButton = screen.getByRole('button', { name: 'Log out' });
    expect(logoutButton.tagName).toBe('BUTTON');
    expect(logoutButton.getAttribute('tabindex')).toBeNull();

    // Keyboard-focusable and activated by both Enter and Space.
    logoutButton.focus();
    // eslint-disable-next-line testing-library/no-node-access
    expect(document.activeElement).toBe(logoutButton);
    await user.keyboard('{Enter}');
    expect(mockLogout).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(mockLogout).toHaveBeenCalledTimes(2);
  });

  it('renders ClientListing and client entity text for user with Viewer role', async () => {
    mockUser = {
      firstName: 'Bob',
      lastName: 'Smith',
      idpProvider: 'BCEIDBUSINESS',
      userName: 'bsmith',
      email: 'bob@example.com',
      roles: [{ role: Role.VIEWER, clients: ['client1'] }],
    } as FamLoginUser;
    await renderWithProviders();
    screen.getByText('Select client');
    screen.getByLabelText('Help: About selecting a default client');
  });

  it('renders ClientListing and client entity text for user with Submitter role', async () => {
    mockUser = {
      firstName: 'Alice',
      lastName: 'Jones',
      idpProvider: 'BCEIDBUSINESS',
      userName: 'ajones',
      email: 'alice@example.com',
      roles: [{ role: Role.SUBMITTER, clients: ['client2'] }],
    } as FamLoginUser;
    await renderWithProviders();
    const tooltipLabel =
      'Optional: Select a default client. This can help you do your searches faster if you work with one client much more than others. You can change or remove this at any time.';
    screen.getByText('Select client');
    screen.getByText(tooltipLabel);
  });
});
